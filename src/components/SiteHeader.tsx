"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { siteConfig } from "@/lib/site";

const navItems = [
  { href: "/projects", label: "Projects" },
  { href: "/portfolio", label: "Selected work" },
  { href: "/consulting", label: "Consulting" },
  { href: "/pricing", label: "Pricing" },
  { href: "/resume", label: "Resume" },
  { href: "/#contact", label: "Contact" }
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="site-header">
      <div className="site-shell nav-row">
        <Link href="/" className="brand-mark" aria-label={`${siteConfig.name} home`}>
          <span className="brand-dot" />
          <span>
            <strong>{siteConfig.name}</strong>
            <small>Builds that move the work forward</small>
          </span>
        </Link>

        <nav className="nav-links" aria-label="Primary navigation">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname === item.href ? "page" : undefined}
              className={pathname === item.href ? "nav-link active" : "nav-link"}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <a className="button button-small button-ghost" href={`mailto:${siteConfig.email}`}>
          Email Devin
        </a>
      </div>
    </header>
  );
}
