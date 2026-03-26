"use client";

/* eslint-disable @next/next/no-img-element */

import NextImage from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { heroStats, siteConfig } from "@/lib/site";
import glassesImage from "../../deal-with-it-glasses-png-clip-art-3.png";

const finalScene = {
  x: 1032,
  y: 40,
  scale: 0.64
} as const;

const finalPhoto = {
  x: 952,
  y: 324,
  scale: 0.98
} as const;

export function HeroComposer() {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [glassesProgress, setGlassesProgress] = useState(0);
  const glassesTravel = 420;

  const glassesAnchorX = 50.5;
  const glassesAnchorY = 31;
  const glassesWidth = 92;
  const glassesRotate = -3.6;
  const glassesLiftOffset = 0;

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateGlassesPosition = () => {
      const viewport = window.innerHeight || 1;
      const progress = Math.min(Math.max(window.scrollY / (viewport * 0.22), 0), 1);
      setGlassesProgress(progress);
    };

    const updatePreference = () => {
      setReduceMotion(media.matches);
    };

    updatePreference();
    updateGlassesPosition();
    media.addEventListener("change", updatePreference);
    window.addEventListener("scroll", updateGlassesPosition, { passive: true });
    window.addEventListener("resize", updateGlassesPosition);

    return () => {
      media.removeEventListener("change", updatePreference);
      window.removeEventListener("scroll", updateGlassesPosition);
      window.removeEventListener("resize", updateGlassesPosition);
    };
  }, []);

  const glassesLift = reduceMotion ? 0 : -glassesTravel + glassesProgress * glassesTravel + glassesLiftOffset;
  const glassesScale = reduceMotion ? 1 : 1;

  return (
      <section className="hero-stage">
      <div className="hero-media-shell">
        <Link
          className="hero-scene-link hero-scene-layer"
          href="/videos"
          aria-label="Open the video carousel"
          style={{ left: finalScene.x, top: finalScene.y, transform: `scale(${finalScene.scale})` }}
        >
          <div className="transform-frame">
            {reduceMotion ? (
              <img src="/logo-var-sbs.jpg" alt="" className="hero-scene-image" />
            ) : (
              <video
                className="hero-scene-video"
                src="/logo-var-animation.mp4"
                poster="/logo-var-sbs.jpg"
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
              />
            )}
          </div>
        </Link>

        <div className="hero-photo-layer" style={{ left: finalPhoto.x, top: finalPhoto.y, transform: `scale(${finalPhoto.scale})` }}>
          <div className="transform-frame circle">
            <a
              className="hero-photo-link"
              href={siteConfig.linkedinUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="Open Devin Otto on LinkedIn"
            >
              <img src="/profilephoto.jpeg" alt="Portrait of Devin Otto" className="hero-photo-image" />
              <div
                className="hero-glasses"
                style={{
                  left: `${glassesAnchorX}%`,
                  top: `${glassesAnchorY}px`,
                  width: `${glassesWidth}px`,
                  transform: `translateX(-50%) translateY(${glassesLift}px) rotate(${glassesRotate}deg) scale(${glassesScale})`
                }}
              >
                <NextImage src={glassesImage} alt="" className="hero-glasses-image" priority />
              </div>
            </a>
          </div>
        </div>
      </div>

      <div className="hero-overlay">
        <div className="site-shell hero-overlay-grid">
          <div className="hero-copy hero-copy-overlay">
            <div className="hero-eyebrow-row">
              <p className="eyebrow">Portfolio, consulting, and digital business card</p>
              <span className="status-pill subtle">Available for consulting</span>
            </div>
            <h1>Internal tools and AI workflows for teams outgrowing spreadsheets.</h1>
            <p className="hero-lead">{siteConfig.intro}</p>

            <div className="button-row hero-actions">
              <Link className="button button-ghost" href="/portfolio">
                View selected work
              </Link>
              <Link className="button" href="/consulting">
                See consulting offers
              </Link>
            </div>

            <div className="hero-stats hero-stats-overlay">
              {heroStats.map((item) => (
                <article key={item.label}>
                  <span className="metric-label">{item.label}</span>
                  <p>{item.value}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
