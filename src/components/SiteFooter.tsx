import Link from "next/link";

import { siteConfig } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-shell footer-grid">
        <div>
          <p className="eyebrow">DevCanDoIt</p>
          <h2>{siteConfig.owner}</h2>
          <p>{siteConfig.intro}</p>
        </div>

        <div>
          <p className="footer-heading">Explore</p>
          <div className="footer-links">
            <Link href="/">Home</Link>
            <Link href="/portfolio">Portfolio</Link>
            <Link href="/consulting">Consulting</Link>
            {!siteConfig.publicSiteOnly ? <Link href={siteConfig.adminPath}>Admin</Link> : null}
            <Link href="/resume">Resume</Link>
            <Link href="/videos">Videos</Link>
          </div>
        </div>

        <div>
          <p className="footer-heading">Contact</p>
          <div className="footer-links">
            <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>
            <a href="/contact-card">Add to contacts</a>
            <span>{siteConfig.location}</span>
          </div>
          <div className="footer-social">
            <a
              className="social-link"
              href={siteConfig.linkedinUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="LinkedIn"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4.98 3.5C4.98 4.88 3.88 6 2.48 6S0 4.88 0 3.5 1.12 1 2.48 1 4.98 2.12 4.98 3.5ZM0.2 8.25h4.56V23H0.2V8.25Zm7.48 0h4.37v2.02h.06c.61-1.17 2.1-2.4 4.31-2.4 4.61 0 5.46 3.03 5.46 6.97V23h-4.56v-7.31c0-1.74-.03-3.98-2.42-3.98-2.42 0-2.79 1.89-2.79 3.85V23H7.68V8.25Z" />
              </svg>
              <span>LinkedIn</span>
            </a>
            <a
              className="social-link"
              href={siteConfig.githubUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 .5C5.65.5.5 5.7.5 12.16c0 5.16 3.29 9.54 7.86 11.09.58.11.79-.26.79-.57v-2.04c-3.2.71-3.88-1.37-3.88-1.37-.52-1.35-1.27-1.71-1.27-1.71-1.04-.73.08-.72.08-.72 1.15.08 1.75 1.21 1.75 1.21 1.02 1.79 2.67 1.27 3.32.97.1-.76.4-1.27.72-1.56-2.56-.3-5.25-1.31-5.25-5.84 0-1.29.45-2.34 1.19-3.16-.12-.3-.52-1.5.11-3.13 0 0 .97-.31 3.18 1.2.92-.26 1.9-.39 2.88-.39.98 0 1.96.13 2.88.39 2.21-1.51 3.18-1.2 3.18-1.2.63 1.63.23 2.83.11 3.13.74.82 1.19 1.87 1.19 3.16 0 4.54-2.69 5.54-5.25 5.84.41.36.78 1.08.78 2.18v3.23c0 .31.21.69.8.57 4.57-1.55 7.85-5.93 7.85-11.09C23.5 5.7 18.35.5 12 .5Z" />
              </svg>
              <span>GitHub</span>
            </a>
            <a
              className="social-link"
              href={siteConfig.tiktokUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="TikTok"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M16.8 4.3c.8 1.6 2.1 2.8 3.9 3.1v3.3c-1.7-.1-3.3-.7-4.7-1.6v6.1c0 3.4-2.7 6.1-6.1 6.1S3.8 18.6 3.8 15.2s2.7-6.1 6.1-6.1c.3 0 .6 0 .9.1v3.5c-.3-.1-.6-.2-.9-.2-1.6 0-2.9 1.3-2.9 2.9s1.3 2.9 2.9 2.9 2.9-1.3 2.9-2.9V2.4h3.3c.2.8.5 1.4.8 1.9Z" />
              </svg>
              <span>TikTok</span>
            </a>
            <a
              className="social-link"
              href={siteConfig.instagramUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7.5 1.5h9c3.3 0 6 2.7 6 6v9c0 3.3-2.7 6-6 6h-9c-3.3 0-6-2.7-6-6v-9c0-3.3 2.7-6 6-6Zm0 1.8c-2.3 0-4.2 1.9-4.2 4.2v9c0 2.3 1.9 4.2 4.2 4.2h9c2.3 0 4.2-1.9 4.2-4.2v-9c0-2.3-1.9-4.2-4.2-4.2h-9Zm9.9 1.2a1.05 1.05 0 1 1 0 2.1 1.05 1.05 0 0 1 0-2.1Zm-5.4 1.7a5.8 5.8 0 1 1 0 11.6 5.8 5.8 0 0 1 0-11.6Zm0 1.8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" />
              </svg>
              <span>Instagram</span>
            </a>
            <a
              className="social-link"
              href={siteConfig.youtubeUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="YouTube"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M23.4 7.5c-.3-1.2-1.3-2.2-2.5-2.5C18.7 4.5 12 4.5 12 4.5s-6.7 0-8.9.5C1.9 5.3.9 6.3.6 7.5.1 9.7.1 12 .1 12s0 2.3.5 4.5c.3 1.2 1.3 2.2 2.5 2.5 2.2.5 8.9.5 8.9.5s6.7 0 8.9-.5c1.2-.3 2.2-1.3 2.5-2.5.5-2.2.5-4.5.5-4.5s0-2.3-.5-4.5Zm-13.9 7.7V8.8l5.9 3.2-5.9 3.2Z" />
              </svg>
              <span>YouTube</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
