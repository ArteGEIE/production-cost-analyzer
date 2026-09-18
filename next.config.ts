import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Server Actions reject requests whose Origin/Host differ from the deployment
// host (e.g. behind a reverse proxy that rewrites Host). List the public
// hostnames in SERVER_ACTIONS_ALLOWED_ORIGINS (comma-separated); AUTH_URL's
// host is added automatically.
function allowedOrigins(): string[] {
  const origins = (process.env.SERVER_ACTIONS_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  const authUrl = process.env.AUTH_URL;
  if (authUrl) {
    try {
      origins.push(new URL(authUrl).host);
    } catch {
      // ignore malformed AUTH_URL — Auth.js reports it on its own
    }
  }
  return [...new Set(origins)];
}

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: [],
  experimental: {
    serverActions: {
      allowedOrigins: allowedOrigins(),
    },
  },
  async headers() {
    return [
      {
        source: "/api/files/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
