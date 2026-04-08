import path from "path";
import { fileURLToPath } from "url";
import type { NextConfig } from "next";

const dirname = path.dirname(fileURLToPath(import.meta.url));

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline'",
  "connect-src 'self' https:",
  "frame-src 'self' https://www.youtube.com https://youtube.com https://www.youtube-nocookie.com",
  "upgrade-insecure-requests"
].join("; ");

const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  {
    key: "Content-Security-Policy",
    value: contentSecurityPolicy,
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), geolocation=(), microphone=(), payment=(), usb=()",
  },
] as const;

const nextConfig: NextConfig = {
  experimental: {
    middlewareClientMaxBodySize: "100mb",
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders.map((header) => ({
          key: header.key,
          value: header.value,
        })),
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/Venus",
        destination: "/Venus/index.html",
      },
    ];
  },
  outputFileTracingRoot: path.join(dirname),
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com"
      }
    ]
  }
};

export default nextConfig;
