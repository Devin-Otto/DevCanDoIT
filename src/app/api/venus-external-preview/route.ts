import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_HOSTS = new Set(["x-minus.cc", "www.x-minus.cc", "x-minus.pro", "www.x-minus.pro"]);

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildErrorDocument(title: string, message: string, targetUrl?: string) {
  const safeTarget = targetUrl ? escapeHtml(targetUrl) : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      :root {
        color-scheme: dark;
        font-family: "Plus Jakarta Sans", "Avenir Next", system-ui, sans-serif;
        background: #09101f;
        color: #edf2ff;
      }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background:
          radial-gradient(circle at top, rgba(255, 255, 255, 0.08), transparent 24%),
          linear-gradient(180deg, #0a1020, #060b17 52%, #04070f);
      }
      article {
        width: min(720px, calc(100vw - 32px));
        padding: 24px;
        border-radius: 24px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        background: rgba(8, 15, 29, 0.86);
        box-shadow: inset 0 1px rgba(255, 255, 255, 0.08);
      }
      h1 { margin: 0 0 12px; font-size: 28px; }
      p { margin: 0 0 16px; line-height: 1.6; color: rgba(237, 242, 255, 0.82); }
      a {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 12px 18px;
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.16);
        color: #edf2ff;
        text-decoration: none;
      }
    </style>
  </head>
  <body>
    <article>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(message)}</p>
      ${targetUrl ? `<a href="${safeTarget}" target="_blank" rel="noreferrer">Open source</a>` : ""}
    </article>
  </body>
</html>`;
}

function normalizePitchSemitones(value: string | null) {
  if (!value) {
    return 0;
  }

  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.max(-7, Math.min(5, Math.round(parsed * 10) / 10));
}

function buildPitchBootstrap(pitchSemitones: number) {
  if (!pitchSemitones) {
    return "";
  }

  const hash = `#pitch=${pitchSemitones.toFixed(1)}&tempo=0.0`;

  return `<script>(function(){try{var desired=${JSON.stringify(
    hash
  )};if(window.location.hash!==desired){window.history.replaceState(null,"",desired);}}catch(_error){}})();</script>`;
}

function rewritePreviewDocument(html: string, targetUrl: URL, pitchSemitones: number) {
  const withoutBase = html.replace(/<base\b[^>]*>/giu, "");
  const injection = `<base href="${escapeHtml(targetUrl.toString())}" /><meta name="referrer" content="no-referrer" />${buildPitchBootstrap(
    pitchSemitones
  )}`;

  if (/<head\b[^>]*>/iu.test(withoutBase)) {
    return withoutBase.replace(/<head\b([^>]*)>/iu, `<head$1>${injection}`);
  }

  return `<!doctype html><html><head>${injection}</head><body>${withoutBase}</body></html>`;
}

function isAllowedTarget(targetUrl: URL) {
  return (targetUrl.protocol === "https:" || targetUrl.protocol === "http:") && ALLOWED_HOSTS.has(targetUrl.hostname);
}

export async function GET(request: NextRequest) {
  const urlParam = request.nextUrl.searchParams.get("url");
  const pitchSemitones = normalizePitchSemitones(request.nextUrl.searchParams.get("pitch"));

  if (!urlParam) {
    return new Response(buildErrorDocument("Preview unavailable", "No source URL was provided."), {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/html; charset=utf-8"
      },
      status: 400
    });
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(urlParam);
  } catch {
    return new Response(buildErrorDocument("Preview unavailable", "That preview link is not a valid URL."), {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/html; charset=utf-8"
      },
      status: 400
    });
  }

  if (!isAllowedTarget(targetUrl)) {
    return new Response(buildErrorDocument("Preview blocked", "Only approved X-Minus links can be shown in this preview."), {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/html; charset=utf-8"
      },
      status: 403
    });
  }

  try {
    const upstream = await fetch(targetUrl, {
      cache: "no-store",
      headers: {
        accept: "text/html,application/xhtml+xml",
        "accept-language": request.headers.get("accept-language") || "en-US,en;q=0.9",
        "user-agent":
          request.headers.get("user-agent") ||
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36"
      },
      redirect: "follow"
    });

    if (!upstream.ok) {
      return new Response(
        buildErrorDocument("Preview unavailable", `The source responded with ${upstream.status}.`, targetUrl.toString()),
        {
          headers: {
            "Cache-Control": "no-store",
            "Content-Type": "text/html; charset=utf-8"
          },
          status: 502
        }
      );
    }

    const contentType = upstream.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) {
      return new Response(
        buildErrorDocument("Preview unavailable", "The source did not return an HTML page for preview.", targetUrl.toString()),
        {
          headers: {
            "Cache-Control": "no-store",
            "Content-Type": "text/html; charset=utf-8"
          },
          status: 415
        }
      );
    }

    const finalUrl = new URL(upstream.url || targetUrl.toString());
    const html = await upstream.text();
    const rewrittenHtml = rewritePreviewDocument(html, finalUrl, pitchSemitones);

    return new Response(rewrittenHtml, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Security-Policy": [
          "sandbox allow-downloads allow-forms allow-modals allow-popups allow-scripts",
          "default-src https: http: data: blob:",
          "img-src https: http: data: blob:",
          "media-src https: http: data: blob:",
          "style-src https: http: 'unsafe-inline'",
          "font-src https: http: data:",
          "script-src https: http: 'unsafe-inline' 'unsafe-eval'",
          "connect-src https: http:"
        ].join("; "),
        "Content-Type": "text/html; charset=utf-8"
      },
      status: 200
    });
  } catch {
    return new Response(
      buildErrorDocument("Preview unavailable", "The X-Minus page could not be loaded right now.", targetUrl.toString()),
      {
        headers: {
          "Cache-Control": "no-store",
          "Content-Type": "text/html; charset=utf-8"
        },
        status: 502
      }
    );
  }
}
