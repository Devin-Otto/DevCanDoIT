"use client";

import { useState } from "react";

import { videoShowcase } from "@/lib/site";

export function VideoCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeVideo = videoShowcase[activeIndex];

  return (
    <div className="video-carousel">
      <article className="surface-card video-stage">
        <div className="project-topline">
          <span className="status-pill subtle">Video carousel</span>
          <span>{activeVideo.title}</span>
        </div>

        <video
          key={activeVideo.src}
          className="video-carousel-video"
          src={activeVideo.src}
          controls
          autoPlay
          muted
          playsInline
          preload="auto"
          onEnded={() => {
            setActiveIndex((currentIndex) => (currentIndex + 1) % videoShowcase.length);
          }}
        />

        <div className="section-copy">
          <h3>{activeVideo.title}</h3>
          <p>{activeVideo.summary}</p>
        </div>
      </article>

      <div className="video-thumb-row" role="tablist" aria-label="Video showcase">
        {videoShowcase.map((video, index) => (
          <button
            key={video.slug}
            type="button"
            className={`video-thumb${index === activeIndex ? " active" : ""}`}
            onClick={() => setActiveIndex(index)}
            aria-pressed={index === activeIndex}
          >
            <span className="metric-label">Clip {index + 1}</span>
            <strong>{video.title}</strong>
            <span>{video.summary}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
