import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { fetchSnapshot, personalModeConfig, T212Error, type T212Snapshot } from "@/lib/broker/trading212";

// Personal-mode Trading 212 sync. GET reports whether it's switched on (no secrets);
// POST returns a read-only snapshot, only with the owner's access code.

let cache: { at: number; snapshot: T212Snapshot } | null = null;
const CACHE_MS = 60_000; // stay well inside Trading 212's rate limits
const failures = new Map<string, { count: number; until: number }>();

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

function codeMatches(given: string, expected: string) {
  const a = Buffer.from(given), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET() {
  const cfg = personalModeConfig();
  return json(200, { enabled: !!cfg, environment: cfg?.environment ?? null });
}

export async function POST(req: NextRequest) {
  const cfg = personalModeConfig();
  if (!cfg) return json(404, { error: "Trading 212 personal mode isn't switched on for this deployment." });

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const f = failures.get(ip);
  if (f && f.until > Date.now()) return json(429, { error: "Too many wrong access codes. Try again in 15 minutes." });
  if (!codeMatches(req.headers.get("x-access-code") ?? "", cfg.accessCode)) {
    const count = (f?.count ?? 0) + 1;
    failures.set(ip, { count, until: count >= 5 ? Date.now() + 15 * 60_000 : 0 });
    return json(401, { error: "That access code isn't right." });
  }
  failures.delete(ip);

  if (cache && Date.now() - cache.at < CACHE_MS) return json(200, { snapshot: cache.snapshot, cached: true });
  try {
    const snapshot = await fetchSnapshot(cfg);
    cache = { at: Date.now(), snapshot };
    return json(200, { snapshot, cached: false });
  } catch (e) {
    if (e instanceof T212Error) return json(e.status === 401 || e.status === 403 ? 502 : e.status, { error: e.message });
    return json(502, { error: "Couldn't reach Trading 212. Try again shortly." });
  }
}
