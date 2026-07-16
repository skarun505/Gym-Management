// Shared CORS allow-list for edge functions. Every function that needs to be
// callable from the browser should use `corsHeaders(req)` instead of a static
// `Access-Control-Allow-Origin: '*'` — all of these functions accept a bearer
// JWT and/or mutate sensitive data (gym creation, password resets), so the
// origin should be restricted to known app hosts, not reflected/wildcarded.
const ALLOWED_ORIGINS = [
  'https://gym-management-sigma-two.vercel.app',
  'http://localhost:5173',
];

// Vercel preview deployments get per-branch hostnames like
// https://gym-management-<hash>-<team>.vercel.app — allow them so the app
// remains testable on previews without widening CORS to arbitrary origins.
const PREVIEW_ORIGIN = /^https:\/\/gym-management-[a-z0-9-]+\.vercel\.app$/;

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? '';
  const allowOrigin =
    ALLOWED_ORIGINS.includes(origin) || PREVIEW_ORIGIN.test(origin)
      ? origin
      : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}
