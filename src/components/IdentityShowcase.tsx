"use client";

/* eslint-disable @next/next/no-img-element */

import NextImage from "next/image";
import { useEffect, useMemo, useState, type CSSProperties } from "react";

import { logoFrameCount, logoFrameSources } from "@/lib/logoFrames";
import { siteConfig } from "@/lib/site";

export function IdentityShowcase() {
  const [avatarSize, setAvatarSize] = useState(192);
  const [avatarX, setAvatarX] = useState(26);
  const [avatarY, setAvatarY] = useState(-84);
  const [sceneX, setSceneX] = useState(68);
  const [sceneY, setSceneY] = useState(-8);
  const [sceneScale, setSceneScale] = useState(148);
  const [cardPaddingTop, setCardPaddingTop] = useState(74);
  const [activeFrame, setActiveFrame] = useState(0);

  useEffect(() => {
    logoFrameSources.forEach((src) => {
      const image = new window.Image();
      image.src = src;
    });

    const interval = window.setInterval(() => {
      setActiveFrame((current) => (current + 1) % logoFrameCount);
    }, 90);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  const showcaseStyle = useMemo(
    () =>
      ({
        "--identity-avatar-size": `${avatarSize}px`,
        "--identity-avatar-x": `${avatarX}px`,
        "--identity-avatar-y": `${avatarY}px`,
        "--identity-scene-x": `${sceneX}px`,
        "--identity-scene-y": `${sceneY}px`,
        "--identity-scene-scale": `${sceneScale / 100}`,
        "--identity-card-padding-top": `${cardPaddingTop}px`
      }) as CSSProperties,
    [avatarSize, avatarX, avatarY, sceneX, sceneY, sceneScale, cardPaddingTop]
  );

  const settingsPreview = `avatarSize: ${avatarSize}, avatarX: ${avatarX}, avatarY: ${avatarY}, sceneX: ${sceneX}, sceneY: ${sceneY}, sceneScale: ${sceneScale}, cardPaddingTop: ${cardPaddingTop}`;

  return (
    <aside className="identity-showcase" style={showcaseStyle}>
      <div className="identity-scene" aria-hidden="true">
        <span className="status-pill subtle identity-scene-pill">DevCanDoIt</span>
        <img src={logoFrameSources[activeFrame]} alt="" className="identity-scene-image" />
      </div>

      <div className="identity-card">
        <div className="identity-avatar">
          <NextImage
            src="/api/profile-photo"
            alt="Portrait of Devin Otto"
            fill
            sizes="(max-width: 980px) 240px, 300px"
            className="identity-avatar-image"
          />
        </div>

        <div className="identity-copy">
          <div className="identity-head">
            <p className="identity-name">
              Devin Otto <span className="identity-badge">AI</span>
            </p>
            <h2>Agentic AI Specialist</h2>
            <p className="identity-meta">{siteConfig.location}, United States</p>
          </div>

          <p className="identity-summary">
            I help businesses turn messy workflows into AI-assisted systems, internal tools, and credible product
            prototypes.
          </p>

          <div className="identity-focus">
            <span className="identity-focus-label">Best fit</span>
            <p>Retail ops, service teams, internal tools, and automation-heavy workflows.</p>
          </div>

          <div className="tag-row identity-tags">
            <span className="tag">Agentic AI</span>
            <span className="tag">React</span>
            <span className="tag">TypeScript</span>
            <span className="tag">Flask</span>
          </div>
        </div>
      </div>

      <div className="identity-tuner">
        <p className="identity-tuner-title">Layout tuner</p>

        <label>
          Avatar size
          <input type="range" min="140" max="260" value={avatarSize} onChange={(event) => setAvatarSize(Number(event.target.value))} />
        </label>

        <label>
          Avatar X
          <input type="range" min="8" max="80" value={avatarX} onChange={(event) => setAvatarX(Number(event.target.value))} />
        </label>

        <label>
          Avatar Y
          <input type="range" min="-160" max="-20" value={avatarY} onChange={(event) => setAvatarY(Number(event.target.value))} />
        </label>

        <label>
          Scene X
          <input type="range" min="-160" max="220" value={sceneX} onChange={(event) => setSceneX(Number(event.target.value))} />
        </label>

        <label>
          Scene Y
          <input type="range" min="-140" max="100" value={sceneY} onChange={(event) => setSceneY(Number(event.target.value))} />
        </label>

        <label>
          Scene scale
          <input type="range" min="70" max="260" value={sceneScale} onChange={(event) => setSceneScale(Number(event.target.value))} />
        </label>

        <label>
          Card top padding
          <input type="range" min="56" max="110" value={cardPaddingTop} onChange={(event) => setCardPaddingTop(Number(event.target.value))} />
        </label>

        <pre>{settingsPreview}</pre>
      </div>
    </aside>
  );
}
