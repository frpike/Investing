import type { NextRequest } from "next/server";
import { fetchSnapshot, personalModeConfig, T212Error, type T212Snapshot } from "@/lib/broker/trading212";
import { checkAccess, personalAccessCode, personalDataFile } from "@/lib/broker/personal-auth";
import { getServerSupabase } from "@/lib/supabase/server";

// Personal-mode Trading 212 sync. GET reports what's switched on (no secrets);
// POST returns a read-only snapshot, only with the owner's access code.

let cache: { at: number; snapshot: T212Snapshot } | null = null;
const CACHE_MS = 60_000; // stay well inside Trading 212's rate limits

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export async function GET() {
  const cfg = personalModeConfig();
  return json(200, { enabled: !!cfg, environment: cfg?.environment ?? null, fileStorage: !!(personalAccessCode() && personalDataFile()) });
}

export async function POST(req: NextRequest) {
  const cfg = personalModeConfig();
  if (!cfg) return json(404, { error: "Trading 212 personal mode isn't switched on for this deployment." });

  const denied = checkAccess(req, cfg.accessCode);
  if (denied) return denied;
  // Optional second lock for internet-facing deployments: only the owner's signed-in account may sync.
  const owner = process.env.OWNER_EMAIL?.trim().replace(/^["']|["']$/g, "").trim().toLowerCase();
  if (owner) {
    const supabase = await getServerSupabase();
    const email = supabase ? (await supabase.auth.getUser()).data.user?.email?.toLowerCase() : undefined;
    if (!email) return json(403, { error: "Sign in with the owner's account to sync Trading 212. (This site address doesn't see you as signed in; sign in again here.)" });
    if (email !== owner) return json(403, { error: `You're signed in as ${email}, which doesn't match OWNER_EMAIL for this site. Check OWNER_EMAIL in Vercel and redeploy.` });
  }

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
