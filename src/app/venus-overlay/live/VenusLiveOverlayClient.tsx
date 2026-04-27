"use client";

import { useEffect, useRef, useState } from "react";

export type OverlayPanel = "all" | "coins" | "daily-hearts" | "followers" | "goal" | "likes";

type OverlayAccentColor = "cyan" | "pink" | "purple";

interface OverlayMetric {
  current: number;
  target: number;
}

interface LiveOverlayState {
  accentColor: OverlayAccentColor;
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

const ACCENT_COLORS: Record<OverlayAccentColor, { glow: string; primary: string; secondary: string; track: string }> = {
  cyan: {
    glow: "rgba(109, 236, 255, 0.35)",
    primary: "#6decff",
    secondary: "#9fd4ff",
    track: "rgba(255,255,255,0.22)"
  },
  pink: {
    glow: "rgba(255, 102, 196, 0.34)",
    primary: "#ff66c4",
    secondary: "#ffb0dd",
    track: "rgba(255,255,255,0.22)"
  },
  purple: {
    glow: "rgba(176, 130, 255, 0.35)",
    primary: "#b082ff",
    secondary: "#dcc7ff",
    track: "rgba(255,255,255,0.22)"
  }
};

const METRIC_PANEL_CONFIG: Record<Exclude<OverlayPanel, "all" | "goal">, { label: string; metricKey: keyof Pick<LiveOverlayState, "coins" | "dailyHearts" | "followers" | "likes"> }> = {
  coins: { label: "Coins", metricKey: "coins" },
  "daily-hearts": { label: "Daily Hearts", metricKey: "dailyHearts" },
  followers: { label: "Followers", metricKey: "followers" },
  likes: { label: "Likes", metricKey: "likes" }
};

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
    accentColor: input?.accentColor === "cyan" || input?.accentColor === "purple" || input?.accentColor === "pink"
      ? input.accentColor
      : DEFAULT_OVERLAY.accentColor,
    coins: normalizeMetric(input?.coins, DEFAULT_OVERLAY.coins),
    dailyHearts: normalizeMetric(input?.dailyHearts, DEFAULT_OVERLAY.dailyHearts),
    followers: normalizeMetric(input?.followers, DEFAULT_OVERLAY.followers),
    goalCurrent:
      typeof input?.goalCurrent === "number" && Number.isFinite(input.goalCurrent)
        ? Math.max(0, Math.round(input.goalCurrent))
        : DEFAULT_OVERLAY.goalCurrent,
    goalLabel:
      typeof input?.goalLabel === "string" && input.goalLabel.trim()
        ? input.goalLabel.trim()
        : DEFAULT_OVERLAY.goalLabel,
    goalTarget:
      typeof input?.goalTarget === "number" && Number.isFinite(input.goalTarget)
        ? Math.max(1, Math.round(input.goalTarget))
        : DEFAULT_OVERLAY.goalTarget,
    likes: normalizeMetric(input?.likes, DEFAULT_OVERLAY.likes),
    updatedAt: typeof input?.updatedAt === "string" ? input.updatedAt : undefined
  };
}

function Ring({
  current,
  size,
  strokeWidth,
  target,
  trackColor,
  valueColor
}: OverlayMetric & {
  size: number;
  strokeWidth: number;
  trackColor: string;
  valueColor: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percent = clampPercent(current, target);
  const dashOffset = circumference - (percent / 100) * circumference;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle
        cx={size / 2}
        cy={size / 2}
        fill="none"
        r={radius}
        stroke={trackColor}
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        fill="none"
        r={radius}
        stroke={valueColor}
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
        strokeWidth={strokeWidth}
        style={{ filter: `drop-shadow(0 0 14px ${valueColor})`, transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
      />
    </svg>
  );
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

function useLiveOverlayState(initialOverlay?: LiveOverlayInput) {
  const normalizedInitialOverlay = normalizeOverlay(initialOverlay);
  const [overlay, setOverlay] = useState<LiveOverlayState>(normalizedInitialOverlay);
  const latestOverlayTimestampRef = useRef(getTimestampValue(normalizedInitialOverlay.updatedAt));

  useEffect(() => {
    let cancelled = false;

    async function refreshOverlay() {
      try {
        const response = await fetch("/api/venus-overlay/state", { cache: "no-store" });
        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as { liveOverlay?: LiveOverlayInput; updatedAt?: string };
        const nextOverlay = normalizeOverlayResponse(payload.liveOverlay, payload.updatedAt);
        if (!cancelled && nextOverlay) {
          const nextTimestamp = getTimestampValue(nextOverlay.updatedAt);
          if (nextTimestamp >= latestOverlayTimestampRef.current) {
            latestOverlayTimestampRef.current = nextTimestamp;
            setOverlay(nextOverlay);
          }
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

  return overlay;
}

function OverlayStage({
  children,
  justify = "center",
  padding = "1.5rem",
  width = "100vw"
}: {
  children: React.ReactNode;
  justify?: "center" | "start";
  padding?: string;
  width?: string;
}) {
  return (
    <main
      style={{
        alignItems: "center",
        background: "transparent",
        color: "#ffffff",
        display: "grid",
        fontFamily: '"Avenir Next", "Trebuchet MS", "Segoe UI", sans-serif',
        justifyItems: justify,
        margin: 0,
        minHeight: "100vh",
        padding,
        textShadow: "0 2px 18px rgba(0,0,0,0.45)",
        userSelect: "none",
        width
      }}
    >
      {children}
    </main>
  );
}

function GoalOverlayContent({ overlay }: { overlay: LiveOverlayState }) {
  const accent = ACCENT_COLORS[overlay.accentColor];
  const goalPercent = clampPercent(overlay.goalCurrent, overlay.goalTarget);

  return (
    <section
      style={{
        alignItems: "center",
        display: "grid",
        justifyItems: "center",
        minWidth: 420
      }}
    >
      <div style={{ position: "relative", width: 420, height: 286 }}>
        <svg width="420" height="286" viewBox="0 0 420 286" aria-hidden="true">
          <path
            d="M 48 198 A 162 162 0 0 1 372 198"
            fill="none"
            stroke={accent.track}
            strokeLinecap="round"
            strokeWidth="26"
          />
          <path
            d="M 48 198 A 162 162 0 0 1 372 198"
            fill="none"
            pathLength="100"
            stroke={accent.primary}
            strokeDasharray={`${goalPercent} 100`}
            strokeLinecap="round"
            strokeWidth="26"
            style={{ filter: `drop-shadow(0 0 18px ${accent.glow})` }}
          />
        </svg>
        <div
          style={{
            alignItems: "center",
            display: "grid",
            gap: "0.5rem",
            inset: 0,
            justifyItems: "center",
            paddingBottom: "1.4rem",
            paddingTop: "0.9rem",
            position: "absolute"
          }}
        >
          <strong style={{ fontSize: "5rem", lineHeight: 0.95 }}>{goalPercent}%</strong>
          <span style={{ fontSize: "3.25rem", fontWeight: 800, lineHeight: 1 }}>
            {formatNumber(overlay.goalCurrent)}/{formatNumber(overlay.goalTarget)}
          </span>
          <span
            style={{
              color: accent.secondary,
              fontSize: "1.55rem",
              fontWeight: 800,
              letterSpacing: "0.14em",
              lineHeight: 1.1,
              marginTop: "0.7rem",
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
  accent,
  label,
  metric
}: {
  accent: OverlayAccentColor;
  label: string;
  metric: OverlayMetric;
}) {
  const colors = ACCENT_COLORS[accent];
  const percent = clampPercent(metric.current, metric.target);

  return (
    <section
      style={{
        alignItems: "center",
        display: "grid",
        gap: "0.65rem",
        justifyItems: "center",
        minWidth: 220
      }}
    >
      <div style={{ position: "relative", width: 168, height: 168 }}>
        <Ring
          current={metric.current}
          size={168}
          strokeWidth={14}
          target={metric.target}
          trackColor={colors.track}
          valueColor={colors.primary}
        />
        <div
          style={{
            alignItems: "center",
            display: "grid",
            gap: "0.15rem",
            inset: 0,
            justifyItems: "center",
            position: "absolute"
          }}
        >
          <strong style={{ fontSize: "2.55rem", lineHeight: 1 }}>{percent}%</strong>
          <span style={{ fontSize: "1.1rem", fontWeight: 700, lineHeight: 1.1 }}>
            {formatNumber(metric.current)}/{formatNumber(metric.target)}
          </span>
        </div>
      </div>
      <strong
        style={{
          color: colors.secondary,
          fontSize: "1.1rem",
          fontWeight: 800,
          letterSpacing: "0.12em",
          lineHeight: 1.15,
          textAlign: "center",
          textTransform: "uppercase"
        }}
      >
        {label}
      </strong>
    </section>
  );
}

function AllOverlay({ overlay }: { overlay: LiveOverlayState }) {
  return (
    <OverlayStage padding="1.5rem 2rem">
      <section
        style={{
          alignItems: "center",
          display: "grid",
          gap: "2.2rem",
          justifyItems: "center"
        }}
      >
        <GoalOverlayContent overlay={overlay} />
        <div
          style={{
            display: "grid",
            gap: "1.25rem",
            gridTemplateColumns: "repeat(4, minmax(180px, 1fr))"
          }}
        >
          <SingleMetricOverlayContent accent={overlay.accentColor} label="Coins" metric={overlay.coins} />
          <SingleMetricOverlayContent accent={overlay.accentColor} label="Daily Hearts" metric={overlay.dailyHearts} />
          <SingleMetricOverlayContent accent={overlay.accentColor} label="Likes" metric={overlay.likes} />
          <SingleMetricOverlayContent accent={overlay.accentColor} label="Followers" metric={overlay.followers} />
        </div>
      </section>
    </OverlayStage>
  );
}

export function VenusLiveOverlayClient({
  initialOverlay,
  panel = "goal"
}: {
  initialOverlay?: LiveOverlayInput;
  panel?: OverlayPanel;
}) {
  const overlay = useLiveOverlayState(initialOverlay);

  if (panel === "all") {
    return <AllOverlay overlay={overlay} />;
  }

  if (panel === "goal") {
    return (
      <OverlayStage padding="1rem">
        <GoalOverlayContent overlay={overlay} />
      </OverlayStage>
    );
  }

  const config = METRIC_PANEL_CONFIG[panel];
  return (
    <OverlayStage padding="1rem">
      <SingleMetricOverlayContent accent={overlay.accentColor} label={config.label} metric={overlay[config.metricKey]} />
    </OverlayStage>
  );
}
