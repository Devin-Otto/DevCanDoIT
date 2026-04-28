"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  type CompanionCharacterId,
  type CompanionOverlaySettings,
  type CompanionResponsePreset,
  type CompanionTriggerEvent,
  getHostedCompanionSpriteSheetUrl
} from "@/lib/venus-companions";

type CompanionMotionKind = "idle" | "jump" | "lieDown" | "run" | "sit" | "walk";
type CompanionEmotionKind = Exclude<CompanionResponsePreset, "bored" | "ignore">;

interface CompanionFrame {
  canvas: HTMLCanvasElement;
  height: number;
  width: number;
}

interface ParsedCompanionSpriteSheet {
  actions: Record<CompanionMotionKind, CompanionFrame[]>;
  emotions: Record<CompanionEmotionKind, CompanionFrame[]>;
}

interface VenusCompanionCanvasStageProps {
  activeCharacterIds: CompanionCharacterId[];
  settings: CompanionOverlaySettings;
  triggerEvents: CompanionTriggerEvent[];
}

type CompanionActorState = {
  activeEmotion: CompanionEmotionKind | null;
  activeEmotionUntil: number;
  boredomTriggered: boolean;
  characterId: CompanionCharacterId;
  currentMotion: CompanionMotionKind;
  facing: -1 | 1;
  frameOffsetMs: number;
  lastEngagementAt: number;
  motionEndsAt: number;
  nextDecisionAt: number;
  pendingEmotion: CompanionEmotionKind | null;
  pendingEmotionAt: number;
  scale: number;
  speedPxPerMs: number;
  targetX: number;
  turnUntil: number;
  width: number;
  x: number;
  y: number;
};

type SpriteRowDefinition = {
  centerY: number;
  columns: number[];
  cropHeight: number;
  cropWidth: number;
};

const BODY_FPS_BY_MOTION: Record<CompanionMotionKind, number> = {
  idle: 4,
  jump: 7,
  lieDown: 2,
  run: 8,
  sit: 3,
  walk: 6
};
const BODY_COLUMNS = [0.105, 0.22, 0.34, 0.46, 0.585, 0.705, 0.83];
const EMOTION_COLUMNS = [0.09, 0.195, 0.305, 0.415, 0.525, 0.635, 0.745, 0.855];
const BODY_ROW_DEFINITIONS: Record<CompanionMotionKind, SpriteRowDefinition> = {
  idle: { centerY: 0.08, columns: BODY_COLUMNS, cropHeight: 0.125, cropWidth: 0.12 },
  jump: { centerY: 0.462, columns: BODY_COLUMNS, cropHeight: 0.13, cropWidth: 0.12 },
  lieDown: { centerY: 0.702, columns: BODY_COLUMNS, cropHeight: 0.105, cropWidth: 0.14 },
  run: { centerY: 0.335, columns: BODY_COLUMNS, cropHeight: 0.125, cropWidth: 0.13 },
  sit: { centerY: 0.58, columns: BODY_COLUMNS, cropHeight: 0.125, cropWidth: 0.12 },
  walk: { centerY: 0.208, columns: BODY_COLUMNS, cropHeight: 0.125, cropWidth: 0.13 }
};
const EMOTION_DEFINITION: SpriteRowDefinition = {
  centerY: 0.816,
  columns: EMOTION_COLUMNS,
  cropHeight: 0.1,
  cropWidth: 0.1
};
const EMOTION_ORDER: CompanionEmotionKind[] = [
  "happy",
  "excited",
  "curious",
  "surprised",
  "sad",
  "angry",
  "surprised",
  "love"
];
const parsedSheetCache = new Map<string, Promise<ParsedCompanionSpriteSheet>>();

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function isMovingMotion(motion: CompanionMotionKind) {
  return motion === "walk" || motion === "run";
}

function randomBetween(minimum: number, maximum: number) {
  return minimum + Math.random() * (maximum - minimum);
}

function getCropRect(
  imageWidth: number,
  imageHeight: number,
  centerXRatio: number,
  centerYRatio: number,
  widthRatio: number,
  heightRatio: number
) {
  const cropWidth = Math.round(imageWidth * widthRatio);
  const cropHeight = Math.round(imageHeight * heightRatio);
  const left = clamp(Math.round(imageWidth * centerXRatio - cropWidth / 2), 0, imageWidth - cropWidth);
  const top = clamp(Math.round(imageHeight * centerYRatio - cropHeight / 2), 0, imageHeight - cropHeight);
  return { cropHeight, cropWidth, left, top };
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load sprite sheet: ${url}`));
    image.src = url;
  });
}

function getBackgroundColor(context: CanvasRenderingContext2D, imageWidth: number, imageHeight: number) {
  const samples = [
    context.getImageData(4, 4, 1, 1).data,
    context.getImageData(imageWidth - 5, 4, 1, 1).data,
    context.getImageData(4, imageHeight - 5, 1, 1).data
  ];

  return samples.reduce(
    (accumulator, sample) => ({
      b: accumulator.b + sample[2] / samples.length,
      g: accumulator.g + sample[1] / samples.length,
      r: accumulator.r + sample[0] / samples.length
    }),
    { b: 0, g: 0, r: 0 }
  );
}

function isBackgroundPixel(red: number, green: number, blue: number, background: { b: number; g: number; r: number }) {
  return Math.abs(red - background.r) <= 18 && Math.abs(green - background.g) <= 18 && Math.abs(blue - background.b) <= 18;
}

function extractFrame(
  sourceContext: CanvasRenderingContext2D,
  imageWidth: number,
  imageHeight: number,
  centerXRatio: number,
  centerYRatio: number,
  widthRatio: number,
  heightRatio: number,
  background: { b: number; g: number; r: number }
) {
  const { cropHeight, cropWidth, left, top } = getCropRect(imageWidth, imageHeight, centerXRatio, centerYRatio, widthRatio, heightRatio);
  const workingCanvas = document.createElement("canvas");
  workingCanvas.width = cropWidth;
  workingCanvas.height = cropHeight;
  const workingContext = workingCanvas.getContext("2d");

  if (!workingContext) {
    return null;
  }

  workingContext.drawImage(sourceContext.canvas, left, top, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
  const imageData = workingContext.getImageData(0, 0, cropWidth, cropHeight);
  const pixels = imageData.data;
  let minX = cropWidth;
  let minY = cropHeight;
  let maxX = -1;
  let maxY = -1;
  let visiblePixelCount = 0;

  for (let y = 0; y < cropHeight; y += 1) {
    for (let x = 0; x < cropWidth; x += 1) {
      const offset = (y * cropWidth + x) * 4;
      const red = pixels[offset];
      const green = pixels[offset + 1];
      const blue = pixels[offset + 2];
      const alpha = pixels[offset + 3];

      if (alpha === 0 || isBackgroundPixel(red, green, blue, background)) {
        pixels[offset + 3] = 0;
        continue;
      }

      visiblePixelCount += 1;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (visiblePixelCount < 120 || maxX < minX || maxY < minY) {
    return null;
  }

  workingContext.putImageData(imageData, 0, 0);
  const padding = 4;
  const trimmedLeft = clamp(minX - padding, 0, cropWidth - 1);
  const trimmedTop = clamp(minY - padding, 0, cropHeight - 1);
  const trimmedWidth = clamp(maxX - minX + 1 + padding * 2, 1, cropWidth - trimmedLeft);
  const trimmedHeight = clamp(maxY - minY + 1 + padding * 2, 1, cropHeight - trimmedTop);

  const frameCanvas = document.createElement("canvas");
  frameCanvas.width = trimmedWidth;
  frameCanvas.height = trimmedHeight;
  const frameContext = frameCanvas.getContext("2d");

  if (!frameContext) {
    return null;
  }

  frameContext.drawImage(workingCanvas, trimmedLeft, trimmedTop, trimmedWidth, trimmedHeight, 0, 0, trimmedWidth, trimmedHeight);
  return {
    canvas: frameCanvas,
    height: trimmedHeight,
    width: trimmedWidth
  } satisfies CompanionFrame;
}

async function parseSpriteSheet(url: string): Promise<ParsedCompanionSpriteSheet> {
  const image = await loadImage(url);
  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = image.naturalWidth;
  sourceCanvas.height = image.naturalHeight;
  const sourceContext = sourceCanvas.getContext("2d");

  if (!sourceContext) {
    throw new Error(`Could not initialize canvas for sprite sheet: ${url}`);
  }

  sourceContext.drawImage(image, 0, 0);
  const background = getBackgroundColor(sourceContext, image.naturalWidth, image.naturalHeight);

  const actions = Object.fromEntries(
    (Object.keys(BODY_ROW_DEFINITIONS) as CompanionMotionKind[]).map((motionKind) => {
      const definition = BODY_ROW_DEFINITIONS[motionKind];
      const frames = definition.columns
        .map((centerXRatio) =>
          extractFrame(
            sourceContext,
            image.naturalWidth,
            image.naturalHeight,
            centerXRatio,
            definition.centerY,
            definition.cropWidth,
            definition.cropHeight,
            background
          )
        )
        .filter((frame): frame is CompanionFrame => Boolean(frame));

      return [motionKind, frames];
    })
  ) as Record<CompanionMotionKind, CompanionFrame[]>;

  const emotions = Object.fromEntries(
    EMOTION_ORDER.map((emotion, index) => {
      const frame = extractFrame(
        sourceContext,
        image.naturalWidth,
        image.naturalHeight,
        EMOTION_DEFINITION.columns[index],
        EMOTION_DEFINITION.centerY,
        EMOTION_DEFINITION.cropWidth,
        EMOTION_DEFINITION.cropHeight,
        background
      );
      return [emotion, frame ? [frame] : []];
    })
  ) as Record<CompanionEmotionKind, CompanionFrame[]>;

  return { actions, emotions };
}

function loadCompanionSpriteSheet(characterId: CompanionCharacterId) {
  const url = getHostedCompanionSpriteSheetUrl(characterId);
  const cached = parsedSheetCache.get(url);
  if (cached) {
    return cached;
  }

  const promise = parseSpriteSheet(url);
  parsedSheetCache.set(url, promise);
  return promise;
}

function resolveEmotionKind(response: CompanionResponsePreset): CompanionEmotionKind | null {
  switch (response) {
    case "angry":
    case "curious":
    case "excited":
    case "happy":
    case "love":
    case "sad":
    case "surprised":
      return response;
    case "bored":
      return "sad";
    default:
      return null;
  }
}

function bodyFrameForActor(actor: CompanionActorState, sheet: ParsedCompanionSpriteSheet, now: number) {
  const frames = sheet.actions[actor.currentMotion];
  if (!frames.length) {
    return null;
  }

  if (actor.turnUntil > now) {
    return frames[frames.length - 1] ?? frames[0];
  }

  const fps = BODY_FPS_BY_MOTION[actor.currentMotion];
  const frameIndex = Math.floor(((now + actor.frameOffsetMs) / 1000) * fps) % frames.length;
  return frames[frameIndex] ?? frames[0];
}

function emotionFrameForActor(actor: CompanionActorState, sheet: ParsedCompanionSpriteSheet) {
  if (!actor.activeEmotion) {
    return null;
  }

  return sheet.emotions[actor.activeEmotion][0] ?? null;
}

function scheduleNextDecision(actor: CompanionActorState, settings: CompanionOverlaySettings, now: number) {
  const config = settings.characters[actor.characterId];
  actor.nextDecisionAt = now + randomBetween(config.idleMinMs, config.idleMaxMs);
}

function chooseRoamTarget(actor: CompanionActorState, stageWidth: number) {
  const padding = 80;
  const nextTarget = randomBetween(padding, stageWidth - padding);
  actor.targetX = nextTarget;
  actor.facing = nextTarget >= actor.x ? 1 : -1;
  actor.speedPxPerMs = randomBetween(0.05, 0.11);
  actor.turnUntil = performance.now() + randomBetween(220, 380);
}

function chooseIdleMotion(actor: CompanionActorState, settings: CompanionOverlaySettings, now: number) {
  const config = settings.characters[actor.characterId];
  const bored = now - actor.lastEngagementAt >= config.boredomMs;

  if (bored) {
    actor.boredomTriggered = true;
    actor.currentMotion = Math.random() < 0.55 ? "lieDown" : "sit";
    actor.activeEmotion = "sad";
    actor.activeEmotionUntil = now + Math.min(3_400, config.reactionDurationMs);
    actor.motionEndsAt = now + randomBetween(config.idleMinMs * 1.2, config.idleMaxMs * 1.6);
    actor.nextDecisionAt = actor.motionEndsAt;
    return;
  }

  actor.boredomTriggered = false;
  const roll = Math.random();
  if (roll < 0.44) {
    actor.currentMotion = Math.random() < 0.28 ? "run" : "walk";
    actor.motionEndsAt = now + randomBetween(3_000, 9_500);
    return;
  }

  if (roll < 0.64) {
    actor.currentMotion = "sit";
    actor.motionEndsAt = now + randomBetween(config.idleMinMs, config.idleMaxMs * 1.1);
    return;
  }

  if (roll < 0.78) {
    actor.currentMotion = "jump";
    actor.motionEndsAt = now + randomBetween(900, 1_550);
    return;
  }

  actor.currentMotion = "idle";
  actor.motionEndsAt = now + randomBetween(config.idleMinMs, config.idleMaxMs);
}

function applyResponseToActor(
  actor: CompanionActorState,
  settings: CompanionOverlaySettings,
  response: CompanionEmotionKind,
  now: number
) {
  const config = settings.characters[actor.characterId];
  actor.lastEngagementAt = now;
  actor.boredomTriggered = false;
  actor.pendingEmotion = null;
  actor.pendingEmotionAt = 0;
  actor.activeEmotion = response;
  actor.activeEmotionUntil = now + config.reactionDurationMs;

  if (response === "sad" || response === "angry") {
    actor.currentMotion = Math.random() < 0.65 ? "sit" : "lieDown";
    actor.motionEndsAt = now + config.reactionDurationMs;
    return;
  }

  if (response === "love" || response === "excited" || response === "surprised") {
    actor.currentMotion = Math.random() < 0.5 ? "jump" : "run";
    actor.motionEndsAt = now + config.reactionDurationMs;
    return;
  }

  actor.currentMotion = Math.random() < 0.45 ? "walk" : "idle";
  actor.motionEndsAt = now + config.reactionDurationMs;
}

function createActorState(characterId: CompanionCharacterId, settings: CompanionOverlaySettings, stageWidth: number, stageHeight: number): CompanionActorState {
  const now = performance.now();
  const x = randomBetween(120, stageWidth - 120);
  const y = randomBetween(stageHeight * 0.74, stageHeight * 0.86);
  const config = settings.characters[characterId];

  return {
    activeEmotion: null,
    activeEmotionUntil: 0,
    boredomTriggered: false,
    characterId,
    currentMotion: "idle",
    facing: Math.random() < 0.5 ? -1 : 1,
    frameOffsetMs: randomBetween(0, 2_000),
    lastEngagementAt: now,
    motionEndsAt: now + randomBetween(config.idleMinMs, config.idleMaxMs),
    nextDecisionAt: now + randomBetween(config.idleMinMs, config.idleMaxMs),
    pendingEmotion: null,
    pendingEmotionAt: 0,
    scale: config.scale,
    speedPxPerMs: randomBetween(0.05, 0.11),
    targetX: x,
    turnUntil: 0,
    width: stageWidth,
    x,
    y
  };
}

export function VenusCompanionCanvasStage({ activeCharacterIds, settings, triggerEvents }: VenusCompanionCanvasStageProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const actorsRef = useRef<CompanionActorState[]>([]);
  const lastFrameAtRef = useRef(performance.now());
  const lastProcessedTriggerIdsRef = useRef<Set<string>>(new Set());
  const animationFrameRef = useRef<number | null>(null);
  const [loadedSheets, setLoadedSheets] = useState<Partial<Record<CompanionCharacterId, ParsedCompanionSpriteSheet>>>({});

  const stageWidth = settings.stageWidth;
  const stageHeight = settings.stageHeight;
  const normalizedActiveCharacterIds = useMemo(() => [...new Set(activeCharacterIds)], [activeCharacterIds]);

  useEffect(() => {
    let cancelled = false;

    async function loadSheets() {
      const entries = await Promise.all(
        normalizedActiveCharacterIds.map(async (characterId) => [characterId, await loadCompanionSpriteSheet(characterId)] as const)
      );
      if (!cancelled) {
        setLoadedSheets(Object.fromEntries(entries));
      }
    }

    if (normalizedActiveCharacterIds.length) {
      void loadSheets();
    } else {
      setLoadedSheets({});
    }

    return () => {
      cancelled = true;
    };
  }, [normalizedActiveCharacterIds]);

  useEffect(() => {
    actorsRef.current = normalizedActiveCharacterIds.map((characterId) => createActorState(characterId, settings, stageWidth, stageHeight));
    lastProcessedTriggerIdsRef.current = new Set();
  }, [normalizedActiveCharacterIds, settings, stageHeight, stageWidth]);

  useEffect(() => {
    const actors = actorsRef.current;
    if (!actors.length) {
      return;
    }

    const nextProcessedIds = new Set(lastProcessedTriggerIdsRef.current);
    const now = performance.now();

    for (const triggerEvent of triggerEvents) {
      if (nextProcessedIds.has(triggerEvent.id)) {
        continue;
      }

      nextProcessedIds.add(triggerEvent.id);
      for (const actor of actors) {
        const response = resolveEmotionKind(settings.characters[actor.characterId].responses[triggerEvent.trigger]);
        if (!response) {
          continue;
        }

        actor.pendingEmotion = response;
        actor.pendingEmotionAt = now + randomBetween(120, 520);
      }
    }

    lastProcessedTriggerIdsRef.current = nextProcessedIds;
  }, [settings, triggerEvents]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    const drawingContext = context;
    const devicePixelRatio = window.devicePixelRatio || 1;
    canvas.width = stageWidth * devicePixelRatio;
    canvas.height = stageHeight * devicePixelRatio;
    drawingContext.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    drawingContext.imageSmoothingEnabled = false;

    function renderFrame(now: number) {
      const actors = actorsRef.current;
      const deltaMs = Math.min(34, Math.max(16, now - lastFrameAtRef.current));
      lastFrameAtRef.current = now;
      drawingContext.clearRect(0, 0, stageWidth, stageHeight);

      for (const actor of actors) {
        const config = settings.characters[actor.characterId];
        const sheet = loadedSheets[actor.characterId];
        if (!sheet) {
          continue;
        }

        if (actor.pendingEmotion && now >= actor.pendingEmotionAt) {
          applyResponseToActor(actor, settings, actor.pendingEmotion, now);
          actor.pendingEmotion = null;
          actor.pendingEmotionAt = 0;
          if (isMovingMotion(actor.currentMotion)) {
            chooseRoamTarget(actor, actor.width);
          }
        }

        if (actor.activeEmotion && now > actor.activeEmotionUntil) {
          actor.activeEmotion = null;
          actor.activeEmotionUntil = 0;
        }

        if (isMovingMotion(actor.currentMotion)) {
          const direction = actor.targetX >= actor.x ? 1 : -1;
          actor.facing = direction;
          actor.x += direction * actor.speedPxPerMs * deltaMs;
          if (Math.abs(actor.targetX - actor.x) < 10 || now >= actor.motionEndsAt) {
            chooseIdleMotion(actor, settings, now);
            scheduleNextDecision(actor, settings, now);
          }
        } else if (now >= actor.nextDecisionAt || now >= actor.motionEndsAt) {
          chooseIdleMotion(actor, settings, now);
          if (isMovingMotion(actor.currentMotion)) {
            chooseRoamTarget(actor, stageWidth);
          } else {
            scheduleNextDecision(actor, settings, now);
          }
        }

        if (now - actor.lastEngagementAt >= config.boredomMs && !actor.boredomTriggered) {
          actor.activeEmotion = "sad";
          actor.activeEmotionUntil = now + Math.min(3_600, config.reactionDurationMs);
          actor.boredomTriggered = true;
        }

        const bodyFrame = bodyFrameForActor(actor, sheet, now);
        if (!bodyFrame) {
          continue;
        }

        const drawWidth = bodyFrame.width * actor.scale;
        const drawHeight = bodyFrame.height * actor.scale;
        const drawX = clamp(actor.x - drawWidth / 2, 8, stageWidth - drawWidth - 8);
        const drawY = clamp(actor.y - drawHeight, 16, stageHeight - drawHeight - 4);

        drawingContext.save();
        drawingContext.globalAlpha = 0.22;
        drawingContext.fillStyle = "#06080f";
        drawingContext.beginPath();
        drawingContext.ellipse(drawX + drawWidth / 2, drawY + drawHeight - 8, drawWidth * 0.22, drawHeight * 0.06, 0, 0, Math.PI * 2);
        drawingContext.fill();
        drawingContext.restore();

        drawingContext.save();
        if (actor.facing === -1) {
          drawingContext.translate(drawX + drawWidth, drawY);
          drawingContext.scale(-1, 1);
          drawingContext.drawImage(bodyFrame.canvas, 0, 0, drawWidth, drawHeight);
        } else {
          drawingContext.drawImage(bodyFrame.canvas, drawX, drawY, drawWidth, drawHeight);
        }
        drawingContext.restore();

        const emotionFrame = emotionFrameForActor(actor, sheet);
        if (emotionFrame) {
          const emotionWidth = emotionFrame.width * Math.max(1.15, actor.scale * 0.9);
          const emotionHeight = emotionFrame.height * Math.max(1.15, actor.scale * 0.9);
          const emotionX = drawX + drawWidth / 2 - emotionWidth / 2;
          const emotionY = drawY - emotionHeight * 0.65;

          drawingContext.save();
          drawingContext.globalAlpha = 0.96;
          drawingContext.drawImage(emotionFrame.canvas, emotionX, emotionY, emotionWidth, emotionHeight);
          drawingContext.restore();
        }
      }

      animationFrameRef.current = window.requestAnimationFrame(renderFrame);
    }

    animationFrameRef.current = window.requestAnimationFrame(renderFrame);
    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [loadedSheets, settings, stageHeight, stageWidth]);

  if (!normalizedActiveCharacterIds.length) {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        background: "transparent",
        display: "block",
        height: "100vh",
        imageRendering: "pixelated",
        width: "100vw"
      }}
    />
  );
}
