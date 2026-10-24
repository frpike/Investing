import "server-only";
import { timingSafeEqual } from "node:crypto";

// Access-code check shared by the personal-mode routes, with a lockout after repeated wrong codes.
const failures = new Map<string, { count: number; until: number }>();

export function personalAccessCode(env: NodeJS.ProcessEnv = process.env): string | null {
  const code = env.T212_ACCESS_CODE?.trim();
  return code && code.length >= 8 ? code : null;
}

export function checkAccess(req: Request, expected: string): Response | null {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const f = failures.get(ip);
  const json = (status: number, error: string) => new Response(JSON.stringify({ error }), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
  if (f && f.until > Date.now()) return json(429, "Too many wrong access codes. Try again in 15 minutes.");
  const given = Buffer.from(req.headers.get("x-access-code") ?? "");
  const want = Buffer.from(expected);
  if (given.length !== want.length || !timingSafeEqual(given, want)) {
    const count = (f?.count ?? 0) + 1;
    failures.set(ip, { count, until: count >= 5 ? Date.now() + 15 * 60_000 : 0 });
    return json(401, "That access code isn't right.");
  }
  failures.delete(ip);
  return null;
}

/** Saving to a file only works where the server has a persistent disk (your own computer), not on Vercel. */
export function personalDataFile(env: NodeJS.ProcessEnv = process.env): string | null {
  if (env.VERCEL || env.PERSONAL_DATA_FILE === "off") return null;
  return env.PERSONAL_DATA_FILE?.trim() || `${process.cwd()}/.data/groundwork.json`;
}
