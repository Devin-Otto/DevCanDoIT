"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  type OverlayPanel,
  type OverlayPanelId,
  type OverlayStylesSettings,
  DEFAULT_OVERLAY_STYLES,
  getOverlayFontFamilyStack,
  getOverlayThemeById,
  normalizeOverlayStyles,
  overlayColorToCssRgba,
  routePanelToOverlayPanelId
} from "@/lib/venus-overlay-theme";

interface OverlayMetric {
  current: number;
  target: number;
}

interface LiveOverlayState {
  accentColor: "cyan" | "pink" | "purple";
  coins: OverlayMetric;
  dailyHearts: OverlayMetric;
  followers: OverlayMetric;
  goalCurrent: number;
  goalLabel: string;
  goalTarget: number;
  likes: OverlayMetric;
  updatedAt?: string;
}

type LiveOverlayInput = Partial<LiveOverlayState> | undefined;

const DEFAULT_OVERLAY: LiveOverlayState = {
  accentColor: "pink",
  coins: { current: 0, target: 1000 },
  dailyHearts: { current: 0, target: 10000 },
  followers: { current: 0, target: 100 },
  goalCurrent: 0,
  goalLabel: "Support Goal",
  goalTarget: 1000,
  likes: { current: 0, target: 5000 }
};

const METRIC_ROUTE_CONFIG = {
  coins: { label: "Coins", metricKey: "coins", panelId: "coins" },
  "daily-hearts": { label: "Daily Hearts", metricKey: "dailyHearts", panelId: "dailyHearts" },
  followers: { label: "Followers", metricKey: "followers", panelId: "followers" },
  likes: { label: "Likes", metricKey: "likes", panelId: "likes" }
} as const satisfies Record<
  Exclude<OverlayPanel, "all" | "goal">,
  { label: string; metricKey: keyof Pick<LiveOverlayState, "coins" | "dailyHearts" | "followers" | "likes">; panelId: OverlayPanelId }
>;

function clampPercent(current: number, target: number) {
  if (!target) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round((current / target) * 100)));
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function getTimestampValue(value?: string) {
  if (!value) {
    return 0;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeMetric(metric: Partial<OverlayMetric> | undefined, fallback: OverlayMetric): OverlayMetric {
  return {
    current: typeof metric?.current === "number" && Number.isFinite(metric.current) ? Math.max(0, Math.round(metric.current)) : fallback.current,
    target: typeof metric?.target === "number" && Number.isFinite(metric.target) ? Math.max(1, Math.round(metric.target)) : fallback.target
  };
}

function normalizeOverlay(input?: LiveOverlayInput): LiveOverlayState {
  return {
    accentColor: input?.accentColor === "cyan" || input?.accentColor === "purple" || input?.accentColor === "pink" ? input.accentColor : DEFAULT_OVERLAY.accentColor,
    coins: normalizeMetric(input?.coins, DEFAULT_OVERLAY.coins),
    dailyHearts: normalizeMetric(input?.dailyHearts, DEFAULT_OVERLAY.dailyHearts),
    followers: normalizeMetric(input?.followers, DEFAULT_OVERLAY.followers),
    goalCurrent:
      typeof input?.goalCurrent === "number" && Number.isFinite(input.goalCurrent)
        ? Math.max(0, Math.round(input.goalCurrent))
        : DEFAULT_OVERLAY.goalCurrent,
    goalLabel: typeof input?.goalLabel === "string" && input.goalLabel.trim() ? input.goalLabel.trim() : DEFAULT_OVERLAY.goalLabel,
    goalTarget:
      typeof input?.goalTarget === "number" && Number.isFinite(input.goalTarget)
        ? Math.max(1, Math.round(input.goalTarget))
        : DEFAULT_OVERLAY.goalTarget,
    likes: normalizeMetric(input?.likes, DEFAULT_OVERLAY.likes),
    updatedAt: typeof input?.updatedAt === "string" ? input.updatedAt : undefined
  };
}

function normalizeOverlayResponse(liveOverlay?: LiveOverlayInput, updatedAt?: string): LiveOverlayState | null {
  if (!liveOverlay) {
    return null;
  }

  return normalizeOverlay({
    ...liveOverlay,
    updatedAt: liveOverlay.updatedAt || updatedAt
  });
}

function createAnimationStyle(theme: OverlayStylesSettings["themes"][number]) {
  if (theme.effects.animation.mode === "none") {
    return undefined;
  }

  return {
    animationDelay: `${theme.effects.animation.delayMs}ms`,
    animationDirection: theme.effects.animation.repeatMode === "alternate" ? "alternate" : "normal",
    animationDuration: `${theme.effects.animation.durationMs}ms`,
    animationIterationCount: "infinite",
    animationName: theme.effects.animation.mode === "fade" ? "venus-overlay-fade" : "venus-overlay-wave",
    animationTimingFunction: theme.effects.animation.easing
  } as const;
}

function useOverlayFeed(initialOverlay?: LiveOverlayInput, initialOverlayStyles?: Partial<OverlayStylesSettings>) {
  const normalizedInitialOverlay = normalizeOverlay(initialOverlay);
  const normalizedInitialStyles = normalizeOverlayStyles(initialOverlayStyles ?? DEFAULT_OVERLAY_STYLES);
  const [overlay, setOverlay] = useState<LiveOverlayState>(normalizedInitialOverlay);
  const [overlayStyles, setOverlayStyles] = useState<OverlayStylesSettings>(normalizedInitialStyles);
  const latestOverlayTimestampRef = useRef(getTimestampValue(normalizedInitialOverlay.updatedAt));

  useEffect(() => {
    let cancelled = false;

    async function refreshOverlay() {
      try {
        const response = await fetch("/api/venus-overlay/state", { cache: "no-store" });
        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as {
          liveOverlay?: LiveOverlayInput;
          overlayStyles?: Partial<OverlayStylesSettings>;
          updatedAt?: string;
        };
        const nextOverlay = normalizeOverlayResponse(payload.liveOverlay, payload.updatedAt);

        if (!cancelled && nextOverlay) {
          const nextTimestamp = getTimestampValue(nextOverlay.updatedAt);
          if (nextTimestamp >= latestOverlayTimestampRef.current) {
            latestOverlayTimestampRef.current = nextTimestamp;
            setOverlay(nextOverlay);
          }
        }

        if (!cancelled && payload.overlayStyles) {
          setOverlayStyles(normalizeOverlayStyles(payload.overlayStyles));
        }
      } catch {
        // Keep the last visible values if polling temporarily fails.
      }
    }

    void refreshOverlay();
    const intervalId = window.setInterval(() => {
      void refreshOverlay();
    }, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  return { overlay, overlayStyles };
}

function buildTextShadow(theme: OverlayStylesSettings["themes"][number]) {
  if (!theme.effects.textShadow.enabled) {
    return "none";
  }

  return `${theme.effects.textShadow.offsetX}px ${theme.effects.textShadow.offsetY}px ${theme.effects.textShadow.blur}px ${overlayColorToCssRgba(
    theme.effects.textShadow.color,
    "rgba(0,0,0,0.42)"
  )}`;
}

function OverlayStage({
  children,
  padding = "1rem"
}: {
  children: React.ReactNode;
  padding?: string;
}) {
  return (
    <main
      style={{
        alignItems: "center",
        background: "transparent",
        color: "#ffffff",
        display: "grid",
        justifyItems: "center",
        margin: 0,
        minHeight: "100vh",
        padding,
        userSelect: "none",
        width: "100vw"
      }}
    >
      <style>
        {`
          @keyframes venus-overlay-fade {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.58; }
          }

          @keyframes venus-overlay-wave {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-8px); }
          }
        `}
      </style>
      {children}
    </main>
  );
}

function GoalOverlayContent({
  overlay,
  overlayStyles
}: {
  overlay: LiveOverlayState;
  overlayStyles: OverlayStylesSettings;
}) {
  const assignment = overlayStyles.panelAssignments.goal;
  const theme = getOverlayThemeById(overlayStyles.themes, assignment.themeId);
  const goalPercent = clampPercent(overlay.goalCurrent, overlay.goalTarget);
  const width = 420 * assignment.wheelScale;
  const height = 300 * assignment.wheelScale;
  const fillColor = theme.wheel.fillMode === "progress-gradient" ? "url(#goal-overlay-gradient)" : theme.wheel.solidColor;
  const animationStyle = createAnimationStyle(theme);
  const wheelGlow = theme.effects.wheelGlow.enabled
    ? `drop-shadow(0 0 ${theme.effects.wheelGlow.blur}px ${overlayColorToCssRgba(theme.effects.wheelGlow.color, theme.effects.wheelGlow.color)})`
    : undefined;

  return (
    <section
      style={{
        alignItems: "center",
        display: "grid",
        fontFamily: getOverlayFontFamilyStack(theme.typography.fontFamily),
        fontWeight: theme.typography.fontWeight,
        justifyItems: "center",
        minWidth: width
      }}
    >
      <div style={{ position: "relative", width, height }}>
        <svg width={width} height={height} viewBox="0 0 420 300" aria-hidden="true" style={{ overflow: "visible" }}>
          <defs>
            <linearGradient id="goal-overlay-gradient" x1="48" y1="198" x2="372" y2="198" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={theme.wheel.gradientStartColor} />
              <stop offset="100%" stopColor={theme.wheel.gradientEndColor} />
            </linearGradient>
          </defs>
          {theme.effects.glassPlate.enabled ? (
            <path
              d="M 90 198 A 120 120 0 0 1 330 198 L 300 198 A 90 90 0 0 0 120 198 Z"
              fill={overlayColorToCssRgba(theme.effects.glassPlate.fillColor, theme.effects.glassPlate.fillColor)}
              stroke={overlayColorToCssRgba(theme.effects.glassPlate.borderColor, theme.effects.glassPlate.borderColor)}
              strokeWidth="1.2"
              style={{ filter: `blur(${theme.effects.glassPlate.blur * 0.08}px)` }}
            />
          ) : null}
          <path
            d="M 48 198 A 162 162 0 0 1 372 198"
            fill="none"
            stroke={theme.wheel.trackColor}
            strokeLinecap="round"
            strokeWidth={theme.wheel.strokeWidth}
          />
          <path
            d="M 48 198 A 162 162 0 0 1 372 198"
            fill="none"
            pathLength="100"
            stroke={fillColor}
            strokeDasharray={`${goalPercent} 100`}
            strokeLinecap="round"
            strokeWidth={theme.wheel.strokeWidth}
            style={{
              ...animationStyle,
              filter: wheelGlow
            }}
          />
        </svg>
        <div
          style={{
            alignItems: "center",
            color: overlayColorToCssRgba(theme.typography.textColor, theme.typography.textColor),
            display: "grid",
            gap: "0.45rem",
            inset: 0,
            justifyItems: "center",
            paddingBottom: `${1.4 * assignment.wheelScale}rem`,
            paddingTop: `${0.8 * assignment.wheelScale}rem`,
            position: "absolute",
            textShadow: buildTextShadow(theme)
          }}
        >
          <strong style={{ fontSize: `${5 * assignment.percentTextScale}rem`, lineHeight: 0.95 }}>{goalPercent}%</strong>
          <span style={{ fontSize: `${3.25 * assignment.valueTextScale}rem`, fontWeight: theme.typography.fontWeight, lineHeight: 1 }}>
            {formatNumber(overlay.goalCurrent)}/{formatNumber(overlay.goalTarget)}
          </span>
          <span
            style={{
              color: overlayColorToCssRgba(theme.typography.labelColor, theme.typography.labelColor),
              fontSize: `${1.5 * assignment.labelTextScale}rem`,
              letterSpacing: "0.14em",
              lineHeight: 1.1,
              marginTop: "0.55rem",
              textAlign: "center",
              textTransform: "uppercase"
            }}
          >
            {overlay.goalLabel}
          </span>
        </div>
      </div>
    </section>
  );
}

function SingleMetricOverlayContent({
  label,
  metric,
  overlayStyles,
  panelId
}: {
  label: string;
  metric: OverlayMetric;
  overlayStyles: OverlayStylesSettings;
  panelId: OverlayPanelId;
}) {
  const assignment = overlayStyles.panelAssignments[panelId];
  const theme = getOverlayThemeById(overlayStyles.themes, assignment.themeId);
  const percent = clampPercent(metric.current, metric.target);
  const canvasSize = 220 * assignment.wheelScale;
  const ringSize = 168 * assignment.wheelScale;
  const strokeWidth = theme.wheel.strokeWidth * 0.42;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (percent / 100) * circumference;
  const center = canvasSize / 2;
  const gradientId = `overlay-gradient-${panelId}`;
  const fillColor = theme.wheel.fillMode === "progress-gradient" ? `url(#${gradientId})` : theme.wheel.solidColor;
  const animationStyle = createAnimationStyle(theme);
  const wheelGlow = theme.effects.wheelGlow.enabled
    ? `drop-shadow(0 0 ${theme.effects.wheelGlow.blur}px ${overlayColorToCssRgba(theme.effects.wheelGlow.color, theme.effects.wheelGlow.color)})`
    : undefined;

  return (
    <section
      style={{
        alignItems: "center",
        display: "grid",
        gap: "0.6rem",
        fontFamily: getOverlayFontFamilyStack(theme.typography.fontFamily),
        fontWeight: theme.typography.fontWeight,
        justifyItems: "center",
        minWidth: Math.max(canvasSize + 24, 220)
      }}
    >
      <div style={{ position: "relative", width: canvasSize, height: canvasSize }}>
        <svg width={canvasSize} height={canvasSize} viewBox={`0 0 ${canvasSize} ${canvasSize}`} aria-hidden="true" style={{ overflow: "visible" }}>
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={theme.wheel.gradientStartColor} />
              <stop offset="100%" stopColor={theme.wheel.gradientEndColor} />
            </linearGradient>
          </defs>
          {theme.effects.glassPlate.enabled ? (
            <circle
              cx={center}
              cy={center}
              r={Math.max(radius - strokeWidth * 0.8, 1)}
              fill={overlayColorToCssRgba(theme.effects.glassPlate.fillColor, theme.effects.glassPlate.fillColor)}
              stroke={overlayColorToCssRgba(theme.effects.glassPlate.borderColor, theme.effects.glassPlate.borderColor)}
              strokeWidth="1.2"
              style={{ filter: `blur(${theme.effects.glassPlate.blur * 0.08}px)` }}
            />
          ) : null}
          <circle cx={center} cy={center} fill="none" r={radius} stroke={theme.wheel.trackColor} strokeWidth={strokeWidth} />
          <g style={animationStyle}>
            <circle
              cx={center}
              cy={center}
              fill="none"
              r={radius}
              stroke={fillColor}
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              strokeWidth={strokeWidth}
              style={{
                filter: wheelGlow,
                transform: "rotate(-90deg)",
                transformOrigin: "50% 50%"
              }}
            />
          </g>
        </svg>
        <div
          style={{
            alignItems: "center",
            color: overlayColorToCssRgba(theme.typography.textColor, theme.typography.textColor),
            display: "grid",
            gap: "0.15rem",
            inset: 0,
            justifyItems: "center",
            position: "absolute",
            textShadow: buildTextShadow(theme)
          }}
        >
          <strong style={{ fontSize: `${2.55 * assignment.percentTextScale}rem`, lineHeight: 1 }}>{percent}%</strong>
          <span style={{ fontSize: `${1.08 * assignment.valueTextScale}rem`, lineHeight: 1.1 }}>
            {formatNumber(metric.current)}/{formatNumber(metric.target)}
          </span>
        </div>
      </div>
      <strong
        style={{
          color: overlayColorToCssRgba(theme.typography.labelColor, theme.typography.labelColor),
          fontSize: `${1.08 * assignment.labelTextScale}rem`,
          letterSpacing: "0.12em",
          lineHeight: 1.15,
          textAlign: "center",
          textShadow: buildTextShadow(theme),
          textTransform: "uppercase"
        }}
      >
        {label}
      </strong>
    </section>
  );
}

function AllOverlay({
  overlay,
  overlayStyles
}: {
  overlay: LiveOverlayState;
  overlayStyles: OverlayStylesSettings;
}) {
  return (
    <OverlayStage padding="1.5rem 2rem">
      <section
        style={{
          alignItems: "center",
          display: "grid",
          gap: "2rem",
          justifyItems: "center"
        }}
      >
        <GoalOverlayContent overlay={overlay} overlayStyles={overlayStyles} />
        <div
          style={{
            display: "grid",
            gap: "1.2rem",
            gridTemplateColumns: "repeat(4, minmax(180px, 1fr))"
          }}
        >
          <SingleMetricOverlayContent label="Coins" metric={overlay.coins} overlayStyles={overlayStyles} panelId="coins" />
          <SingleMetricOverlayContent label="Daily Hearts" metric={overlay.dailyHearts} overlayStyles={overlayStyles} panelId="dailyHearts" />
          <SingleMetricOverlayContent label="Likes" metric={overlay.likes} overlayStyles={overlayStyles} panelId="likes" />
          <SingleMetricOverlayContent label="Followers" metric={overlay.followers} overlayStyles={overlayStyles} panelId="followers" />
        </div>
      </section>
    </OverlayStage>
  );
}

export function VenusLiveOverlayClient({
  initialOverlay,
  initialOverlayStyles,
  panel = "goal"
}: {
  initialOverlay?: LiveOverlayInput;
  initialOverlayStyles?: Partial<OverlayStylesSettings>;
  panel?: OverlayPanel;
}) {
  const { overlay, overlayStyles } = useOverlayFeed(initialOverlay, initialOverlayStyles);
  const singlePanelId = useMemo(() => routePanelToOverlayPanelId(panel), [panel]);

  if (panel === "all") {
    return <AllOverlay overlay={overlay} overlayStyles={overlayStyles} />;
  }

  if (panel === "goal") {
    return (
      <OverlayStage padding="1rem">
        <GoalOverlayContent overlay={overlay} overlayStyles={overlayStyles} />
      </OverlayStage>
    );
  }

  if (!singlePanelId) {
    return null;
  }

  const config = METRIC_ROUTE_CONFIG[panel];
  return (
    <OverlayStage padding="1rem">
      <SingleMetricOverlayContent label={config.label} metric={overlay[config.metricKey]} overlayStyles={overlayStyles} panelId={singlePanelId} />
    </OverlayStage>
  );
}
