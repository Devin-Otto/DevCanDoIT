export type OverlayPanel = "all" | "coins" | "daily-hearts" | "followers" | "goal" | "likes";
export type OverlayPanelId = "goal" | "coins" | "dailyHearts" | "likes" | "followers";
export type OverlayThemeId = string;
export type OverlayAnimationMode = "none" | "fade" | "wave";
export type OverlayAnimationEasing = "ease-out" | "ease-in-out" | "linear";
export type OverlayAnimationRepeatMode = "alternate" | "loop";
export type OverlayWheelFillMode = "solid" | "progress-gradient";
export type OverlayFontFamily = "venus-display" | "system-sans" | "serif";

export interface OverlayThemeTypography {
  fontFamily: OverlayFontFamily;
  fontWeight: number;
  labelColor: string;
  textColor: string;
}

export interface OverlayThemeWheel {
  fillMode: OverlayWheelFillMode;
  gradientEndColor: string;
  gradientStartColor: string;
  solidColor: string;
  strokeWidth: number;
  trackColor: string;
}

export interface OverlayThemeTextShadowEffect {
  blur: number;
  color: string;
  enabled: boolean;
  offsetX: number;
  offsetY: number;
}

export interface OverlayThemeWheelGlowEffect {
  blur: number;
  color: string;
  enabled: boolean;
}

export interface OverlayThemeGlassPlateEffect {
  blur: number;
  borderColor: string;
  enabled: boolean;
  fillColor: string;
  innerGlowColor: string;
}

export interface OverlayThemeAnimationEffect {
  delayMs: number;
  durationMs: number;
  easing: OverlayAnimationEasing;
  mode: OverlayAnimationMode;
  repeatMode: OverlayAnimationRepeatMode;
}

export interface OverlayThemeEffects {
  animation: OverlayThemeAnimationEffect;
  glassPlate: OverlayThemeGlassPlateEffect;
  textShadow: OverlayThemeTextShadowEffect;
  wheelGlow: OverlayThemeWheelGlowEffect;
}

export interface OverlayTheme {
  createdAt: string;
  effects: OverlayThemeEffects;
  id: OverlayThemeId;
  isBuiltIn: boolean;
  name: string;
  typography: OverlayThemeTypography;
  updatedAt: string;
  wheel: OverlayThemeWheel;
}

export interface OverlayPanelStyleAssignment {
  labelTextScale: number;
  percentTextScale: number;
  themeId: OverlayThemeId;
  valueTextScale: number;
  wheelScale: number;
}

export interface OverlayStylesSettings {
  panelAssignments: Record<OverlayPanelId, OverlayPanelStyleAssignment>;
  themes: OverlayTheme[];
  version: number;
}

const BUILT_IN_TIMESTAMP = new Date(0).toISOString();
export const OVERLAY_PANEL_IDS: OverlayPanelId[] = ["goal", "coins", "dailyHearts", "likes", "followers"];
export const VALID_OVERLAY_PANELS: OverlayPanel[] = ["all", "coins", "daily-hearts", "followers", "goal", "likes"];
export const DEFAULT_OVERLAY_THEME_ID = "overlay-theme-built-in-pink";
const CYAN_OVERLAY_THEME_ID = "overlay-theme-built-in-cyan";
const PURPLE_OVERLAY_THEME_ID = "overlay-theme-built-in-purple";
const OVERLAY_ANIMATION_MODES: OverlayAnimationMode[] = ["none", "fade", "wave"];
const OVERLAY_ANIMATION_EASINGS: OverlayAnimationEasing[] = ["ease-out", "ease-in-out", "linear"];
const OVERLAY_ANIMATION_REPEAT_MODES: OverlayAnimationRepeatMode[] = ["loop", "alternate"];
const OVERLAY_WHEEL_FILL_MODES: OverlayWheelFillMode[] = ["solid", "progress-gradient"];
const OVERLAY_FONT_FAMILIES: OverlayFontFamily[] = ["venus-display", "system-sans", "serif"];

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function expandHexTriplet(value: string) {
  return value
    .split("")
    .map((character) => `${character}${character}`)
    .join("");
}

interface OverlayColorParts {
  alpha: number;
  blue: number;
  green: number;
  red: number;
}

function parseHexColor(value: string): OverlayColorParts | null {
  const match = value.trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/iu);
  if (!match) {
    return null;
  }

  const raw = match[1].toLowerCase();
  const normalized = raw.length === 3 ? expandHexTriplet(raw) : raw;
  const colorHex = normalized.length === 8 ? normalized.slice(0, 6) : normalized;
  const alphaHex = normalized.length === 8 ? normalized.slice(6, 8) : "ff";

  return {
    alpha: Number.parseInt(alphaHex, 16) / 255,
    blue: Number.parseInt(colorHex.slice(4, 6), 16),
    green: Number.parseInt(colorHex.slice(2, 4), 16),
    red: Number.parseInt(colorHex.slice(0, 2), 16)
  };
}

function parseRgbChannel(value: string) {
  const parsed = Number.parseFloat(value.trim());
  return Number.isFinite(parsed) ? clamp(Math.round(parsed), 0, 255) : null;
}

function parseRgbAlpha(value: string) {
  const parsed = Number.parseFloat(value.trim());
  return Number.isFinite(parsed) ? clamp(parsed, 0, 1) : null;
}

function parseRgbLikeColor(value: string): OverlayColorParts | null {
  const match = value.trim().match(/^rgba?\((.+)\)$/iu);
  if (!match) {
    return null;
  }

  const segments = match[1].split(",").map((segment) => segment.trim());
  if (segments.length !== 3 && segments.length !== 4) {
    return null;
  }

  const red = parseRgbChannel(segments[0]);
  const green = parseRgbChannel(segments[1]);
  const blue = parseRgbChannel(segments[2]);
  const alpha = segments.length === 4 ? parseRgbAlpha(segments[3]) : 1;

  if (red === null || green === null || blue === null || alpha === null) {
    return null;
  }

  return { alpha, blue, green, red };
}

function parseOverlayColor(value: string): OverlayColorParts | null {
  return parseHexColor(value) ?? parseRgbLikeColor(value);
}

function serializeHex(parts: OverlayColorParts) {
  return `#${[parts.red, parts.green, parts.blue]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;
}

function serializeRgba(parts: OverlayColorParts) {
  const alpha = Number.parseFloat(parts.alpha.toFixed(3));
  return `rgba(${parts.red}, ${parts.green}, ${parts.blue}, ${alpha})`;
}

export function normalizeOverlayColor(value: unknown, fallback: string) {
  if (typeof value !== "string") {
    return fallback;
  }

  const parsed = parseOverlayColor(value);
  if (!parsed) {
    return fallback;
  }

  return parsed.alpha >= 0.999 ? serializeHex(parsed) : serializeRgba(parsed);
}

export function overlayColorToCssRgba(value: string, fallback: string) {
  const parsed = parseOverlayColor(value);
  return parsed ? serializeRgba(parsed) : fallback;
}

function normalizeFontFamily(value: unknown, fallback: OverlayFontFamily) {
  return OVERLAY_FONT_FAMILIES.includes(value as OverlayFontFamily) ? (value as OverlayFontFamily) : fallback;
}

function normalizeAnimationMode(value: unknown, fallback: OverlayAnimationMode) {
  return OVERLAY_ANIMATION_MODES.includes(value as OverlayAnimationMode) ? (value as OverlayAnimationMode) : fallback;
}

function normalizeAnimationEasing(value: unknown, fallback: OverlayAnimationEasing) {
  return OVERLAY_ANIMATION_EASINGS.includes(value as OverlayAnimationEasing) ? (value as OverlayAnimationEasing) : fallback;
}

function normalizeAnimationRepeatMode(value: unknown, fallback: OverlayAnimationRepeatMode) {
  return OVERLAY_ANIMATION_REPEAT_MODES.includes(value as OverlayAnimationRepeatMode)
    ? (value as OverlayAnimationRepeatMode)
    : fallback;
}

function normalizeWheelFillMode(value: unknown, fallback: OverlayWheelFillMode) {
  return OVERLAY_WHEEL_FILL_MODES.includes(value as OverlayWheelFillMode) ? (value as OverlayWheelFillMode) : fallback;
}

function createBuiltInTheme(theme: {
  glassBorder: string;
  glassFill: string;
  glassInnerGlow: string;
  glowColor: string;
  gradientEndColor: string;
  gradientStartColor: string;
  id: OverlayThemeId;
  labelColor: string;
  name: string;
  solidColor: string;
  textColor: string;
  trackColor: string;
}) {
  return {
    createdAt: BUILT_IN_TIMESTAMP,
    effects: {
      animation: {
        delayMs: 0,
        durationMs: 1800,
        easing: "ease-in-out",
        mode: "none",
        repeatMode: "loop"
      },
      glassPlate: {
        blur: 22,
        borderColor: theme.glassBorder,
        enabled: false,
        fillColor: theme.glassFill,
        innerGlowColor: theme.glassInnerGlow
      },
      textShadow: {
        blur: 20,
        color: "rgba(0, 0, 0, 0.42)",
        enabled: true,
        offsetX: 0,
        offsetY: 4
      },
      wheelGlow: {
        blur: 26,
        color: theme.glowColor,
        enabled: true
      }
    },
    id: theme.id,
    isBuiltIn: true,
    name: theme.name,
    typography: {
      fontFamily: "venus-display",
      fontWeight: 800,
      labelColor: theme.labelColor,
      textColor: theme.textColor
    },
    updatedAt: BUILT_IN_TIMESTAMP,
    wheel: {
      fillMode: "solid",
      gradientEndColor: theme.gradientEndColor,
      gradientStartColor: theme.gradientStartColor,
      solidColor: theme.solidColor,
      strokeWidth: 34,
      trackColor: theme.trackColor
    }
  } satisfies OverlayTheme;
}

export const BUILT_IN_OVERLAY_THEMES: OverlayTheme[] = [
  createBuiltInTheme({
    glassBorder: "rgba(255, 220, 242, 0.28)",
    glassFill: "rgba(255, 171, 224, 0.12)",
    glassInnerGlow: "rgba(255, 131, 204, 0.26)",
    glowColor: "rgba(255, 102, 196, 0.38)",
    gradientEndColor: "#ffb0dd",
    gradientStartColor: "#ff66c4",
    id: DEFAULT_OVERLAY_THEME_ID,
    labelColor: "#ffafe3",
    name: "Pink Halo",
    solidColor: "#ff66c4",
    textColor: "#ffffff",
    trackColor: "rgba(255, 255, 255, 0.22)"
  }),
  createBuiltInTheme({
    glassBorder: "rgba(198, 239, 255, 0.28)",
    glassFill: "rgba(105, 236, 255, 0.1)",
    glassInnerGlow: "rgba(100, 200, 255, 0.24)",
    glowColor: "rgba(109, 236, 255, 0.38)",
    gradientEndColor: "#9fd4ff",
    gradientStartColor: "#6decff",
    id: CYAN_OVERLAY_THEME_ID,
    labelColor: "#a6ebff",
    name: "Aurora Cyan",
    solidColor: "#6decff",
    textColor: "#ffffff",
    trackColor: "rgba(255, 255, 255, 0.2)"
  }),
  createBuiltInTheme({
    glassBorder: "rgba(224, 212, 255, 0.28)",
    glassFill: "rgba(176, 130, 255, 0.12)",
    glassInnerGlow: "rgba(190, 132, 255, 0.24)",
    glowColor: "rgba(176, 130, 255, 0.38)",
    gradientEndColor: "#dcc7ff",
    gradientStartColor: "#b082ff",
    id: PURPLE_OVERLAY_THEME_ID,
    labelColor: "#dcc7ff",
    name: "Royal Pulse",
    solidColor: "#b082ff",
    textColor: "#ffffff",
    trackColor: "rgba(255, 255, 255, 0.22)"
  })
];

function cloneTheme(theme: OverlayTheme): OverlayTheme {
  return {
    ...theme,
    effects: {
      ...theme.effects,
      animation: { ...theme.effects.animation },
      glassPlate: { ...theme.effects.glassPlate },
      textShadow: { ...theme.effects.textShadow },
      wheelGlow: { ...theme.effects.wheelGlow }
    },
    typography: { ...theme.typography },
    wheel: { ...theme.wheel }
  };
}

export function createDefaultOverlayPanelAssignment(themeId = DEFAULT_OVERLAY_THEME_ID): OverlayPanelStyleAssignment {
  return {
    labelTextScale: 1,
    percentTextScale: 1,
    themeId,
    valueTextScale: 1,
    wheelScale: 1
  };
}

export const DEFAULT_OVERLAY_STYLES: OverlayStylesSettings = {
  panelAssignments: {
    coins: createDefaultOverlayPanelAssignment(),
    dailyHearts: createDefaultOverlayPanelAssignment(),
    followers: createDefaultOverlayPanelAssignment(),
    goal: createDefaultOverlayPanelAssignment(),
    likes: createDefaultOverlayPanelAssignment()
  },
  themes: BUILT_IN_OVERLAY_THEMES.map(cloneTheme),
  version: 1
};

export function normalizeOverlayTheme(theme: Partial<OverlayTheme> | undefined, fallback: OverlayTheme): OverlayTheme {
  const typography = (theme?.typography ?? {}) as Partial<OverlayTheme["typography"]>;
  const wheel = (theme?.wheel ?? {}) as Partial<OverlayTheme["wheel"]>;
  const effects = (theme?.effects ?? {}) as Partial<OverlayTheme["effects"]>;
  const textShadow = (effects.textShadow ?? {}) as Partial<OverlayTheme["effects"]["textShadow"]>;
  const wheelGlow = (effects.wheelGlow ?? {}) as Partial<OverlayTheme["effects"]["wheelGlow"]>;
  const glassPlate = (effects.glassPlate ?? {}) as Partial<OverlayTheme["effects"]["glassPlate"]>;
  const animation = (effects.animation ?? {}) as Partial<OverlayTheme["effects"]["animation"]>;
  const safeId = typeof theme?.id === "string" && theme.id.trim() ? theme.id.trim() : fallback.id;

  return {
    createdAt: typeof theme?.createdAt === "string" && theme.createdAt ? theme.createdAt : fallback.createdAt,
    effects: {
      animation: {
        delayMs: isFiniteNumber(animation.delayMs) ? clamp(Math.round(animation.delayMs), 0, 15000) : fallback.effects.animation.delayMs,
        durationMs: isFiniteNumber(animation.durationMs) ? clamp(Math.round(animation.durationMs), 250, 30000) : fallback.effects.animation.durationMs,
        easing: normalizeAnimationEasing(animation.easing, fallback.effects.animation.easing),
        mode: normalizeAnimationMode(animation.mode, fallback.effects.animation.mode),
        repeatMode: normalizeAnimationRepeatMode(animation.repeatMode, fallback.effects.animation.repeatMode)
      },
      glassPlate: {
        blur: isFiniteNumber(glassPlate.blur) ? clamp(Math.round(glassPlate.blur), 0, 60) : fallback.effects.glassPlate.blur,
        borderColor: normalizeOverlayColor(glassPlate.borderColor, fallback.effects.glassPlate.borderColor),
        enabled: typeof glassPlate.enabled === "boolean" ? glassPlate.enabled : fallback.effects.glassPlate.enabled,
        fillColor: normalizeOverlayColor(glassPlate.fillColor, fallback.effects.glassPlate.fillColor),
        innerGlowColor: normalizeOverlayColor(glassPlate.innerGlowColor, fallback.effects.glassPlate.innerGlowColor)
      },
      textShadow: {
        blur: isFiniteNumber(textShadow.blur) ? clamp(Math.round(textShadow.blur), 0, 60) : fallback.effects.textShadow.blur,
        color: normalizeOverlayColor(textShadow.color, fallback.effects.textShadow.color),
        enabled: typeof textShadow.enabled === "boolean" ? textShadow.enabled : fallback.effects.textShadow.enabled,
        offsetX: isFiniteNumber(textShadow.offsetX) ? clamp(Math.round(textShadow.offsetX), -40, 40) : fallback.effects.textShadow.offsetX,
        offsetY: isFiniteNumber(textShadow.offsetY) ? clamp(Math.round(textShadow.offsetY), -40, 40) : fallback.effects.textShadow.offsetY
      },
      wheelGlow: {
        blur: isFiniteNumber(wheelGlow.blur) ? clamp(Math.round(wheelGlow.blur), 0, 80) : fallback.effects.wheelGlow.blur,
        color: normalizeOverlayColor(wheelGlow.color, fallback.effects.wheelGlow.color),
        enabled: typeof wheelGlow.enabled === "boolean" ? wheelGlow.enabled : fallback.effects.wheelGlow.enabled
      }
    },
    id: safeId,
    isBuiltIn: BUILT_IN_OVERLAY_THEMES.some((entry) => entry.id === safeId),
    name: typeof theme?.name === "string" && theme.name.trim() ? theme.name.trim() : fallback.name,
    typography: {
      fontFamily: normalizeFontFamily(typography.fontFamily, fallback.typography.fontFamily),
      fontWeight: isFiniteNumber(typography.fontWeight) ? clamp(Math.round(typography.fontWeight), 300, 900) : fallback.typography.fontWeight,
      labelColor: normalizeOverlayColor(typography.labelColor, fallback.typography.labelColor),
      textColor: normalizeOverlayColor(typography.textColor, fallback.typography.textColor)
    },
    updatedAt: typeof theme?.updatedAt === "string" && theme.updatedAt ? theme.updatedAt : fallback.updatedAt,
    wheel: {
      fillMode: normalizeWheelFillMode(wheel.fillMode, fallback.wheel.fillMode),
      gradientEndColor: normalizeOverlayColor(wheel.gradientEndColor, fallback.wheel.gradientEndColor),
      gradientStartColor: normalizeOverlayColor(wheel.gradientStartColor, fallback.wheel.gradientStartColor),
      solidColor: normalizeOverlayColor(wheel.solidColor, fallback.wheel.solidColor),
      strokeWidth: isFiniteNumber(wheel.strokeWidth) ? clamp(Math.round(wheel.strokeWidth), 8, 64) : fallback.wheel.strokeWidth,
      trackColor: normalizeOverlayColor(wheel.trackColor, fallback.wheel.trackColor)
    }
  };
}

function normalizeCustomThemeCollection(themes: OverlayTheme[] | undefined) {
  const builtInIds = new Set(BUILT_IN_OVERLAY_THEMES.map((theme) => theme.id));
  const seenIds = new Set<string>();
  const customThemes: OverlayTheme[] = [];

  for (const theme of themes ?? []) {
    if (!theme || typeof theme !== "object") {
      continue;
    }

    const candidateId = typeof theme.id === "string" ? theme.id.trim() : "";
    if (!candidateId || builtInIds.has(candidateId) || seenIds.has(candidateId)) {
      continue;
    }

    const normalizedTheme = normalizeOverlayTheme(theme, BUILT_IN_OVERLAY_THEMES[0]);
    normalizedTheme.isBuiltIn = false;
    customThemes.push(normalizedTheme);
    seenIds.add(normalizedTheme.id);
  }

  return customThemes;
}

function normalizeOverlayPanelAssignment(
  assignment: Partial<OverlayPanelStyleAssignment> | undefined,
  themes: OverlayTheme[],
  fallback: OverlayPanelStyleAssignment
): OverlayPanelStyleAssignment {
  const requestedThemeId = typeof assignment?.themeId === "string" && assignment.themeId.trim() ? assignment.themeId.trim() : fallback.themeId;
  const resolvedThemeId = themes.some((theme) => theme.id === requestedThemeId) ? requestedThemeId : DEFAULT_OVERLAY_THEME_ID;

  return {
    labelTextScale: isFiniteNumber(assignment?.labelTextScale) ? clamp(assignment.labelTextScale, 0.6, 2.4) : fallback.labelTextScale,
    percentTextScale: isFiniteNumber(assignment?.percentTextScale) ? clamp(assignment.percentTextScale, 0.6, 2.4) : fallback.percentTextScale,
    themeId: resolvedThemeId,
    valueTextScale: isFiniteNumber(assignment?.valueTextScale) ? clamp(assignment.valueTextScale, 0.6, 2.4) : fallback.valueTextScale,
    wheelScale: isFiniteNumber(assignment?.wheelScale) ? clamp(assignment.wheelScale, 0.6, 1.9) : fallback.wheelScale
  };
}

export function normalizeOverlayStyles(settings?: Partial<OverlayStylesSettings>): OverlayStylesSettings {
  const themes = [...BUILT_IN_OVERLAY_THEMES.map(cloneTheme), ...normalizeCustomThemeCollection(settings?.themes)];

  return {
    panelAssignments: {
      coins: normalizeOverlayPanelAssignment(settings?.panelAssignments?.coins, themes, DEFAULT_OVERLAY_STYLES.panelAssignments.coins),
      dailyHearts: normalizeOverlayPanelAssignment(settings?.panelAssignments?.dailyHearts, themes, DEFAULT_OVERLAY_STYLES.panelAssignments.dailyHearts),
      followers: normalizeOverlayPanelAssignment(settings?.panelAssignments?.followers, themes, DEFAULT_OVERLAY_STYLES.panelAssignments.followers),
      goal: normalizeOverlayPanelAssignment(settings?.panelAssignments?.goal, themes, DEFAULT_OVERLAY_STYLES.panelAssignments.goal),
      likes: normalizeOverlayPanelAssignment(settings?.panelAssignments?.likes, themes, DEFAULT_OVERLAY_STYLES.panelAssignments.likes)
    },
    themes,
    version: isFiniteNumber(settings?.version) ? Math.max(1, Math.round(settings.version)) : DEFAULT_OVERLAY_STYLES.version
  };
}

export function getOverlayThemeById(themes: OverlayTheme[], themeId: string | undefined) {
  return themes.find((theme) => theme.id === themeId) ?? themes[0] ?? BUILT_IN_OVERLAY_THEMES[0];
}

export function getOverlayFontFamilyStack(fontFamily: OverlayFontFamily) {
  switch (fontFamily) {
    case "system-sans":
      return '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    case "serif":
      return '"Iowan Old Style", "Palatino Linotype", Georgia, serif';
    case "venus-display":
    default:
      return '"Avenir Next", "Trebuchet MS", "Segoe UI", sans-serif';
  }
}

export function routePanelToOverlayPanelId(panel: OverlayPanel): OverlayPanelId | null {
  switch (panel) {
    case "goal":
      return "goal";
    case "coins":
      return "coins";
    case "daily-hearts":
      return "dailyHearts";
    case "followers":
      return "followers";
    case "likes":
      return "likes";
    case "all":
    default:
      return null;
  }
}
