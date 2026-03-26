"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";

import { logoFrameCount, logoFrameSources } from "@/lib/logoFrames";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function ScrollLogo() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const [progressLabel, setProgressLabel] = useState("0%");
  const [activeFrame, setActiveFrame] = useState(0);

  useEffect(() => {
    logoFrameSources.forEach((src) => {
      const image = new Image();
      image.src = src;
    });

    const update = () => {
      frameRef.current = null;

      const section = sectionRef.current;

      if (!section) {
        return;
      }

      const rect = section.getBoundingClientRect();
      const viewport = window.innerHeight;
      const progress = clamp((viewport - rect.top) / (rect.height + viewport * 0.15), 0, 1);
      const nextFrame = Math.min(logoFrameCount - 1, Math.round(progress * (logoFrameCount - 1)));

      setActiveFrame(nextFrame);
      setProgressLabel(`${Math.round(progress * 100)}%`);
    };

    const requestTick = () => {
      if (frameRef.current !== null) {
        return;
      }

      frameRef.current = window.requestAnimationFrame(update);
    };

    requestTick();
    window.addEventListener("scroll", requestTick, { passive: true });
    window.addEventListener("resize", requestTick);

    return () => {
      window.removeEventListener("scroll", requestTick);
      window.removeEventListener("resize", requestTick);

      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  return (
    <section ref={sectionRef} className="logo-scroll-section">
      <div className="site-shell logo-scroll-grid">
        <div className="section-copy logo-copy">
          <p className="eyebrow">Signature motion</p>
          <h2>The old logo becomes a scroll-driven signal.</h2>
          <p>
            The rotating mark from your LinkedIn look is built into the site as a cinematic, tactile section.
            As people scroll, the logo scrubs through the motion instead of just sitting there.
          </p>
          <div className="logo-metrics">
            <div>
              <span className="metric-label">Interaction</span>
              <strong>Scroll-scrubbed MP4</strong>
            </div>
            <div>
              <span className="metric-label">Progress</span>
              <strong>{progressLabel}</strong>
            </div>
          </div>
        </div>

        <div className="logo-stage">
          <div className="logo-stage-inner">
            <div className="logo-stage-caption">
              <span>DevCanDoIt mark</span>
              <span>Motion tied to attention</span>
            </div>
            <img
              className="logo-video"
              src={logoFrameSources[activeFrame]}
              alt="Scroll-driven rotation of the DevCanDoIt logo"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
