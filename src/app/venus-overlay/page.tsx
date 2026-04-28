import Link from "next/link";

const OVERLAY_LINKS = [
  {
    description: "Single arc goal overlay.",
    href: "/venus-overlay/live/goal",
    label: "Goal layer",
  },
  {
    description: "Coins progress ring only.",
    href: "/venus-overlay/live/coins",
    label: "Coins layer",
  },
  {
    description: "Daily hearts progress ring only.",
    href: "/venus-overlay/live/daily-hearts",
    label: "Daily hearts layer",
  },
  {
    description: "Likes progress ring only.",
    href: "/venus-overlay/live/likes",
    label: "Likes layer",
  },
  {
    description: "Followers progress ring only.",
    href: "/venus-overlay/live/followers",
    label: "Followers layer",
  },
  {
    description: "Goal plus every metric together.",
    href: "/venus-overlay/live/all",
    label: "All layers",
  },
  {
    description: "Animated sprite companion scene.",
    href: "/venus-overlay/companions",
    label: "Companion scene",
  },
];

export const dynamic = "force-dynamic";

export default function VenusOverlayIndexPage() {
  return (
    <main
      style={{
        alignItems: "center",
        background: "transparent",
        color: "#f6f4ff",
        display: "grid",
        minHeight: "100vh",
        padding: "2rem 1.25rem",
      }}
    >
      <section
        style={{
          background: "linear-gradient(180deg, rgba(27, 20, 51, 0.92), rgba(10, 13, 26, 0.86))",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "28px",
          boxShadow: "0 28px 80px rgba(0,0,0,0.38)",
          display: "grid",
          gap: "1.25rem",
          maxWidth: "980px",
          padding: "1.6rem",
          width: "min(980px, 100%)",
        }}
      >
        <div style={{ display: "grid", gap: "0.45rem" }}>
          <p
            style={{
              color: "rgba(205, 196, 255, 0.82)",
              fontSize: "0.78rem",
              letterSpacing: "0.22em",
              margin: 0,
              textTransform: "uppercase",
            }}
          >
            Overlay Index
          </p>
          <h1
            style={{
              fontFamily: '"Space Grotesk", "Avenir Next", sans-serif',
              fontSize: "clamp(2rem, 4vw, 3.25rem)",
              lineHeight: 0.95,
              margin: 0,
            }}
          >
            Venus stream overlay pages
          </h1>
          <p
            style={{
              color: "rgba(233, 228, 255, 0.8)",
              fontSize: "1rem",
              lineHeight: 1.6,
              margin: 0,
              maxWidth: "60ch",
            }}
          >
            Use this page as the launch hub for TikTok Studio browser sources. Each destination below is a separate transparent layer.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gap: "0.9rem",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          }}
        >
          {OVERLAY_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                background: "linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.03))",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "22px",
                color: "inherit",
                display: "grid",
                gap: "0.55rem",
                minHeight: "150px",
                padding: "1rem",
                textDecoration: "none",
              }}
              target="_blank"
              rel="noreferrer"
            >
              <strong
                style={{
                  fontFamily: '"Space Grotesk", "Avenir Next", sans-serif',
                  fontSize: "1.2rem",
                }}
              >
                {link.label}
              </strong>
              <span style={{ color: "rgba(233, 228, 255, 0.74)", fontSize: "0.95rem", lineHeight: 1.5 }}>
                {link.description}
              </span>
              <code
                style={{
                  alignSelf: "end",
                  color: "rgba(255, 183, 227, 0.92)",
                  fontFamily: '"SFMono-Regular", "Menlo", monospace',
                  fontSize: "0.8rem",
                }}
              >
                {link.href}
              </code>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
