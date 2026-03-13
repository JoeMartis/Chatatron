import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["tar"],
  allowedDevOrigins: ["http://127.0.0.1:3000", "http://localhost:3000", "http://127.0.0.1", "http://localhost"],
  async headers() {
    // Skip CSP in development — it blocks Turbopack HMR WebSocket
    // connections, causing Next.js to fall back to polling which
    // triggers full page refreshes that break SSE streams.
    const securityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-XSS-Protection", value: "1; mode=block" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=()",
      },
    ];

    if (process.env.NODE_ENV === "production") {
      securityHeaders.push({
        key: "Content-Security-Policy",
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline'",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: blob:",
          "font-src 'self'",
          "connect-src 'self'",
          "frame-ancestors 'none'",
        ].join("; "),
      });
    }

    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
