import "server-only";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { SupabaseStore } from "@/lib/store/supabase-store";
import { SUPABASE_URL } from "@/lib/supabase/config";
import { LearnerContextSchema, type LearnerContext } from "./context";
import { WindowLimiter } from "./rate-limit";

const HOUR = 3_600_000;
export const ACCOUNT_LIMIT = Number(process.env.TUTOR_HOURLY_LIMIT ?? 20);
export const GUEST_LIMIT = Number(process.env.TUTOR_GUEST_HOURLY_LIMIT ?? 5);
const guestLimiter = new WindowLimiter(GUEST_LIMIT, HOUR);
const accountFallbackLimiter = new WindowLimiter(ACCOUNT_LIMIT, HOUR);

/** Counts one tutor message against the user's hourly allowance. */
export async function takeQuota(user: User | null, ip: string): Promise<{ ok: boolean; limit: number }> {
  if (!user) return { ok: guestLimiter.take(`ip:${ip}`).ok, limit: GUEST_LIMIT };
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey || !SUPABASE_URL) return { ok: accountFallbackLimiter.take(`u:${user.id}`).ok, limit: ACCOUNT_LIMIT };
  const admin = createClient(SUPABASE_URL, serviceKey, { auth: { persistSession: false } });
  const window = new Date(Math.floor(Date.now() / HOUR) * HOUR).toISOString();
  const { data, error } = await admin.rpc("take_usage", { p_user: user.id, p_feature: "tutor_message", p_window: window, p_limit: ACCOUNT_LIMIT });
  if (error) throw new Error(`usage check failed: ${error.message}`);
  return { ok: (data as number) > 0, limit: ACCOUNT_LIMIT };
}

/** The learner's context read from their own database rows (RLS applies), so it can be trusted. */
export async function loadVerifiedContext(db: SupabaseClient, userId: string): Promise<LearnerContext> {
  const data = await new SupabaseStore(db, userId).load();
  return LearnerContextSchema.parse({
    experience: data.prefs?.experience,
    focus: data.prefs?.focus,
    horizon: data.prefs?.horizon,
    lessonsCompleted: Object.values(data.lessonProgress).filter((p) => p.status === "completed").map((p) => p.lessonId),
    mastery: Object.fromEntries(Object.values(data.concepts).map((c) => [c.conceptId, c.mastery])),
    portfolio: data.portfolio ? { baseCurrency: data.portfolio.baseCurrency, holdings: data.portfolio.holdings.slice(0, 200) } : null,
  });
}
