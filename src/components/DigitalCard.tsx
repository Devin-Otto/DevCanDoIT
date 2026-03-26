"use client";

import { useState, type KeyboardEvent, type MouseEvent } from "react";

import { siteConfig } from "@/lib/site";

function isInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(target.closest("a,button,input,textarea,select,[data-no-card-flip='true']"));
}

export function DigitalCard({ compact = false }: { compact?: boolean }) {
  const [flipped, setFlipped] = useState(false);

  const toggleFlip = () => {
    setFlipped((current) => !current);
  };

  const handleClick = (event: MouseEvent<HTMLElement>) => {
    if (isInteractiveTarget(event.target)) {
      return;
    }

    toggleFlip();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleFlip();
    }
  };

  return (
    <aside
      className={`digital-card flip-card${compact ? " compact" : ""}${flipped ? " is-flipped" : ""}`}
      role="button"
      tabIndex={0}
      aria-pressed={flipped}
      aria-label={flipped ? "Flip back to the contact card front" : "Flip to see the animated logo back"}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <div className="flip-card-inner">
        <div className="digital-card-face digital-card-front">
          <div className="digital-card-top">
            <div>
              <p className="eyebrow">Mobile business card</p>
              <h2>{siteConfig.owner}</h2>
              <p className="card-role">{siteConfig.title}</p>
            </div>
            <div className="status-pill">Available for consulting</div>
          </div>

          <div className="card-grid">
            <div>
              <p className="card-label">Company</p>
              <p>{siteConfig.name}</p>
            </div>
            <div>
              <p className="card-label">Location</p>
              <p>{siteConfig.location}</p>
            </div>
            <div>
              <p className="card-label">Email</p>
              <a data-no-card-flip="true" href={`mailto:${siteConfig.email}`}>
                {siteConfig.email}
              </a>
            </div>
            <div>
              <p className="card-label">Focus</p>
              <p>Internal tools, AI workflows, and product systems</p>
            </div>
          </div>

          <div className="tag-row">
            {siteConfig.primaryStack.map((item) => (
              <span key={item} className="tag">
                {item}
              </span>
            ))}
          </div>

          <div className="button-row">
            <a
              data-no-card-flip="true"
              className="button"
              href={`mailto:${siteConfig.email}?subject=Project%20inquiry%20for%20DevCanDoIt`}
            >
              Start a conversation
            </a>
            <a data-no-card-flip="true" className="button button-ghost" href="/contact-card">
              Add to contacts
            </a>
          </div>
        </div>

        <div className="digital-card-face digital-card-back" aria-hidden={!flipped}>
          <div className="digital-card-back-copy">
            <h2>DevCanDoIt</h2>
          </div>

          <div className="digital-card-back-media">
            <video
              className="digital-card-back-video"
              src="/logo-var-animation.mp4"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
            />
          </div>
        </div>
      </div>
    </aside>
  );
}
