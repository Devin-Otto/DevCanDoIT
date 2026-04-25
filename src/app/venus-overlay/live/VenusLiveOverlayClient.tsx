"use client";

import { useEffect, useMemo, useState } from "react";

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

const ACCENT_COLORS: Record<OverlayAccentColor, { glow: string; primary: string; secondary: string }> = {
  cyan: { glow: "rgba(109, 236, 255, 0.35)", primary: "#6decff", secondary: "#9fd4ff" },
  pink: { glow: "rgba(255, 102, 196, 0.34)", primary: "#ff66c4", secondary: "#ffb0dd" },
  purple: { glow: "rgba(176, 130, 255, 0.35)", primary: "#b082ff", secondary: "#dcc7ff" }
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

function Ring({ current, size, strokeWidth, target, trackColor, valueColor }: OverlayMetric & { size: number; strokeWidth: number; trackColor: string; valueColor: string; }) {
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
        style={{ transform: `rotate(-90deg)`, transformOrigin: "50% 50%" }}
      />
    </svg>
  );
}

function MetricCard({ accent, label, metric }: { accent: OverlayAccentColor; label: string; metric: OverlayMetric }) {
  const colors = ACCENT_COLORS[accent];
  const percent = clampPercent(metric.current, metric.target);

  return (
    <div
      style={{
        alignItems: "center",
        display: "grid",
        gap: "0.55rem",
        justifyItems: "center",
        minWidth: 150
      }}
    >
      <div style={{ position: "relative", width: 118, height: 118 }}>
        <Ring current={metric.current} size={118} strokeWidth={12} target={metric.target} trackColor="rgba(255,255,255,0.18)" valueColor={colors.primary} />
        <div
          style={{
            alignItems: "center",
            display: "grid",
            inset: 0,
            justifyItems: "center",
            position: "absolute"
          }}
        >
          <strong style={{ fontSize: "1.8rem", lineHeight: 1 }}>{percent}%</strong>
        </div>
      </div>
      <div style={{ display: "grid", gap: "0.15rem", justifyItems: "center", textAlign: "center" }}>
        <strong style={{ fontSize: "1.05rem", letterSpacing: "0.04em", textTransform: "uppercase" }}>{label}</strong>
        <span style={{ fontSize: "1.5rem", fontWeight: 700 }}>{formatNumber(metric.current)}/{formatNumber(metric.target)}</span>
      </div>
    </div>
  );
}

export function VenusLiveOverlayClient() {
  const [overlay, setOverlay] = useState<LiveOverlayState>(DEFAULT_OVERLAY);

  useEffect(() => {
    let cancelled = false;

    async function refreshOverlay() {
      try {
        const response = await fetch("/api/venus-overlay/state", { cache: "no-store" });
        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as { liveOverlay?: LiveOverlayState };
        if (!cancelled && payload.liveOverlay) {
          setOverlay(payload.liveOverlay);
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

  const accent = useMemo(() => ACCENT_COLORS[overlay.accentColor], [overlay.accentColor]);
  const goalPercent = clampPercent(overlay.goalCurrent, overlay.goalTarget);

  return (
    <main
      style={{
        alignItems: "center",
        background: "transparent",
        color: "#ffffff",
        display: "grid",
        fontFamily: '"Avenir Next", "Trebuchet MS", "Segoe UI", sans-serif',
        gap: "2.5rem",
        justifyItems: "center",
        minHeight: "100vh",
        padding: "2rem",
        textShadow: "0 2px 20px rgba(0,0,0,0.45)",
        userSelect: "none"
      }}
    >
      <section
        style={{
          alignItems: "center",
          display: "grid",
          gap: "0.85rem",
          justifyItems: "center"
        }}
      >
        <div style={{ position: "relative", width: 320, height: 190 }}>
          <svg width="320" height="190" viewBox="0 0 320 190" aria-hidden="true">
            <path
              d="M 34 158 A 126 126 0 0 1 286 158"
              fill="none"
              stroke="rgba(255,255,255,0.28)"
              strokeLinecap="round"
              strokeWidth="22"
            />
            <path
              d="M 34 158 A 126 126 0 0 1 286 158"
              fill="none"
              pathLength="100"
              stroke={accent.primary}
              strokeDasharray={`${goalPercent} 100`}
              strokeLinecap="round"
              strokeWidth="22"
              style={{ filter: `drop-shadow(0 0 18px ${accent.glow})` }}
            />
          </svg>
          <div
            style={{
              alignItems: "center",
              display: "grid",
              gap: "0.45rem",
              inset: 0,
              justifyItems: "center",
              paddingTop: "1.5rem",
              position: "absolute"
            }}
          >
            <strong style={{ fontSize: "3.4rem", lineHeight: 1 }}>{goalPercent}%</strong>
            <span style={{ fontSize: "2.6rem", fontWeight: 700, lineHeight: 1.05 }}>
              {formatNumber(overlay.goalCurrent)}/{formatNumber(overlay.goalTarget)}
            </span>
            <span
              style={{
                color: accent.secondary,
                fontSize: "2.05rem",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase"
              }}
            >
              {overlay.goalLabel}
            </span>
          </div>
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gap: "1.8rem",
          gridTemplateColumns: "repeat(4, minmax(150px, 1fr))",
          width: "min(100%, 900px)"
        }}
      >
        <MetricCard accent={overlay.accentColor} label="Coins" metric={overlay.coins} />
        <MetricCard accent={overlay.accentColor} label="Daily Hearts" metric={overlay.dailyHearts} />
        <MetricCard accent={overlay.accentColor} label="Likes" metric={overlay.likes} />
        <MetricCard accent={overlay.accentColor} label="Followers" metric={overlay.followers} />
      </section>
    </main>
  );
}
