import { z } from "zod";
import { CONCEPT_BY_ID } from "@/content/concepts";
import { summarize } from "@/lib/portfolio/metrics";
import type { Holding } from "@/lib/portfolio/types";

// What the tutor is told about the learner. Built on the server. For signed-in learners the
// data comes from the database; for guests it comes from their browser and is labelled
// as unverified so the tutor treats it accordingly.

export const MAX_MESSAGES = 30;
export const MAX_MESSAGE_CHARS = 4000;

const HoldingInput = z.object({
  id: z.string().max(64),
  name: z.string().min(1).max(160),
  ticker: z.string().max(32).nullable(),
  isin: z.string().max(12).nullable(),
  assetType: z.enum(["share", "etf", "fund", "bond", "cash", "other"]).nullable(),
  sector: z.string().max(60).nullable(),
  region: z.string().max(60).nullable(),
  quantity: z.number().nonnegative().finite(),
  instrumentCurrency: z.string().regex(/^[A-Z]{3}$/),
  avgPrice: z.number().finite().nullable(),
  costBasisBase: z.number().finite().nullable(),
  lastPrice: z.number().finite().nullable(),
  lastPriceAt: z.string().max(40).nullable(),
  lastPriceSource: z.enum(["manual", "csv_trading212", "api_trading212", "user_price"]).nullable(),
  fxRateToBase: z.number().positive().finite().nullable(),
  source: z.enum(["manual", "csv_trading212", "api_trading212", "user_price"]),
});

export const LearnerContextSchema = z.object({
  experience: z.string().max(20).optional(),
  focus: z.string().max(20).optional(),
  horizon: z.string().max(20).optional(),
  lessonsCompleted: z.array(z.string().max(64)).max(200).default([]),
  /** concept id → mastery 0–1 */
  mastery: z.record(z.string().max(64), z.number().min(0).max(1)).default({}),
  portfolio: z.object({ baseCurrency: z.string().regex(/^[A-Z]{3}$/), holdings: z.array(HoldingInput).max(200) }).nullable().default(null),
});
export type LearnerContext = z.infer<typeof LearnerContextSchema>;

export const TutorRequestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().min(1).max(MAX_MESSAGE_CHARS),
  })).min(1).max(MAX_MESSAGES)
    .refine((m) => m.length > 0 && m[0].role === "user" && m[m.length - 1].role === "user", "Conversation must start and end with the learner"),
  context: LearnerContextSchema.optional(),
});
export type TutorRequest = z.infer<typeof TutorRequestSchema>;

const money = (n: number, cur: string) => `${cur === "GBP" ? "£" : cur + " "}${n.toFixed(2)}`;

export function buildContextBlock(ctx: LearnerContext | null, opts: { verified: boolean; today: string }): string {
  const lines: string[] = [`Today's date: ${opts.today}.`];
  if (!ctx) return [...lines, "No learner profile is available. Treat them as a beginner."].join("\n");
  lines.push(`Learner: experience ${ctx.experience ?? "not given"}, focus ${ctx.focus ?? "not given"}, time horizon ${ctx.horizon ?? "not given"}.`);
  lines.push(`Lessons completed: ${ctx.lessonsCompleted.length ? ctx.lessonsCompleted.join(", ") : "none yet"}.`);
  const weak = Object.entries(ctx.mastery).filter(([, m]) => m < 0.5).map(([c]) => CONCEPT_BY_ID.get(c)?.title ?? c);
  if (weak.length) lines.push(`Concepts they're still building (pitch explanations simply here): ${weak.slice(0, 10).join(", ")}.`);

  const p = ctx.portfolio;
  if (!p || !p.holdings.length) {
    lines.push("Portfolio: none connected or entered. Don't assume they hold anything.");
    return lines.join("\n");
  }
  const provenance = opts.verified
    ? "Portfolio data below comes from the learner's account records (manual entries and CSV imports they made). Prices are user-entered or from imports, not live market data."
    : "Portfolio data below was entered in the learner's browser and is UNVERIFIED. Treat it as what they told you, not as fact.";
  lines.push(provenance);
  const s = summarize({ baseCurrency: p.baseCurrency, holdings: p.holdings as Holding[] });
  for (const h of p.holdings) {
    const price = h.lastPrice != null ? `price ${h.lastPrice} ${h.instrumentCurrency} as of ${h.lastPriceAt ?? "unknown date"}` : "current price UNKNOWN";
    const cost = h.costBasisBase != null ? `cost ${money(h.costBasisBase, p.baseCurrency)}` : "cost UNKNOWN";
    lines.push(`- ${h.name}${h.ticker ? ` (${h.ticker})` : ""}: ${h.quantity} units, ${price}, ${cost}${h.assetType ? `, type ${h.assetType}` : ""}${h.sector ? `, sector label ${h.sector}` : ""}.`);
  }
  lines.push(s.totalValue != null
    ? `Total value: ${money(s.totalValue, p.baseCurrency)}.`
    : `Total value UNKNOWN because ${s.unpriced.length} holding(s) have no price; value of priced holdings is ${money(s.pricedValue, p.baseCurrency)}.`);
  if (s.unrealised) lines.push(`Unrealised gain/loss over ${s.unrealised.holdingsCounted} of ${s.unrealised.holdingsTotal} holdings with known value and cost: ${money(s.unrealised.amount, p.baseCurrency)}.`);
  if (s.largest) lines.push(`Largest holding: ${s.largest.label} at ${(s.largest.weight * 100).toFixed(1)}% of priced value.`);
  if (s.stale.length) lines.push(`Stale prices (over a week old): ${s.stale.map((x) => x.name).join(", ")}.`);
  return lines.join("\n");
}
