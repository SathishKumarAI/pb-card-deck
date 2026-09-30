import type { NextConfig } from "next";

// Baseline CSP. Next.js App Router injects inline bootstrap scripts/styles, so
// 'unsafe-inline' is required here until a nonce-based CSP lands (backlog F327).
// connect-src is NOT broad any more: it is 'self' plus exactly the Supabase
// project this deployment is configured with (phase 2a). A wildcard there is how
// a compromised dependency phones home, and the sync layer only ever talks to one
// host. With no project configured it stays 'self' alone.
// React's development build needs eval() for its debugging features (readable
// callstacks, component inspection). Blocking it does not make the dev server
// safer - it just turns the dev overlay into a permanent CSP error and loses
// those features. Production never gets 'unsafe-eval'.
const devEval = process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "";

// The configured Supabase project, if any: "https://ref.supabase.co wss://ref.supabase.co".
// Empty string when this deployment has no account service, which keeps the
// policy at 'self' and is the default.
const supabaseOrigins = (() => {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return "";
  try {
    const { origin, host } = new URL(raw);
    return ` ${origin} wss://${host}`;
  } catch {
    // A malformed URL must not silently widen the policy.
    return "";
  }
})();

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${devEval}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  // The one remote host the app may talk to, derived from the same env var the
  // client uses. Both the REST origin and its websocket scheme, for realtime.
  `connect-src 'self'${supabaseOrigins}`,
  "manifest-src 'self'",
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

// Security headers applied to every route (backlog F327, F328).
const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self), accelerometer=(self)" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
