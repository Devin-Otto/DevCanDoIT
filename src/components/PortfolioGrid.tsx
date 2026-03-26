"use client";

import Link from "next/link";
import { useState } from "react";

import { portfolioFilters, projects } from "@/lib/site";

export function PortfolioGrid() {
  const [activeFilter, setActiveFilter] = useState<(typeof portfolioFilters)[number]>("All");

  const visibleProjects =
    activeFilter === "All"
      ? projects
      : projects.filter((project) => project.category.includes(activeFilter));

  return (
    <div className="portfolio-grid-wrap">
      <div className="filter-row" role="tablist" aria-label="Portfolio filters">
        {portfolioFilters.map((filter) => (
          <button
            key={filter}
            type="button"
            className={`filter-chip${filter === activeFilter ? " active" : ""}`}
            onClick={() => setActiveFilter(filter)}
          >
            {filter}
          </button>
        ))}
      </div>

      <div className="portfolio-grid">
        {visibleProjects.map((project) => (
            <article key={project.slug} className="project-card" id={project.slug}>
              <div className="project-topline">
                <span className="status-pill subtle">{project.status}</span>
                <span>{project.audience}</span>
              </div>
              <h3>{project.title}</h3>
              <p>{project.summary}</p>
              <div className="project-split">
                <div>
                  <span className="metric-label">Problem</span>
                  <p>{project.problem}</p>
                </div>
                <div>
                  <span className="metric-label">Impact</span>
                  <p>{project.impact}</p>
                </div>
              </div>
              <div className="tag-row">
                {project.stack.map((item) => (
                  <span key={item} className="tag">
                  {item}
                </span>
              ))}
            </div>
            <Link className="button button-ghost" href="/#contact">
              {project.cta}
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
