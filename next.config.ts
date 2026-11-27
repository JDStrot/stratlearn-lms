import type { NextConfig } from "next";

/**
 * Browser security settings sent with every page.
 * No full Content-Security-Policy yet: the courses use inline scripts and Google Fonts,
 * so a strict one would need careful testing across all 64 courses first.
 */
const securityHeaders = [
  // Always use HTTPS on this domain for the next two years.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  // Pages can only be shown inside frames on this same site (the course player). Stops click-jacking.
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'; base-uri 'self'; object-src 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Don't leak full page addresses (which can hold sign-in or answer tokens) to other sites.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // The app never needs these device features.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
