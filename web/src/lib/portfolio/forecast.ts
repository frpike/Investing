import { holdingValue } from "./metrics";
import type { AssetType, Holding } from "./types";

// Illustrative projections. Nothing here forecasts what will happen: it shows the RANGE of
// outcomes implied by simple, editable assumptions about average return and volatility,
// so learners can see how time, contributions and diversification change that range.

export interface Assumption { label: string; returnPct: number; volatilityPct: number }
export type RiskClass = "diversified" | "single" | "bond" | "cash";

/** Rough planning assumptions (yearly, before inflation and fees). The learner can change them. */
export const DEFAULT_ASSUMPTIONS: Record<RiskClass, Assumption> = {
  diversified: { label: "Diversified share fund (ETF/index fund)", returnPct: 6, volatilityPct: 16 },
  single: { label: "Individual company share", returnPct: 6, volatilityPct: 32 },
  bond: { label: "Bonds or bond fund", returnPct: 3.5, volatilityPct: 7 },
  cash: { label: "Cash", returnPct: 3, volatilityPct: 1 },
};
/** How closely risky holdings move together. 1 = in lockstep; lower = more diversification benefit. */
export const DEFAULT_CORRELATION = 0.6;

const FUND_WORDS = /\b(etf|ucits|index|tracker|fund|acc|dist|vanguard|ishares|spdr|invesco|xtrackers|msci|ftse|s&p)\b/i;

/** Uses the learner's label when set; otherwise guesses from the name (shown as a guess in the UI). */
export function riskClassOf(h: Pick<Holding, "assetType" | "name">): { cls: RiskClass; guessed: boolean } {
  const byType: Partial<Record<AssetType, RiskClass>> = { etf: "diversified", fund: "diversified", share: "single", bond: "bond", cash: "cash" };
  if (h.assetType && byType[h.assetType]) return { cls: byType[h.assetType]!, guessed: false };
  return { cls: FUND_WORDS.test(h.name) ? "diversified" : "single", guessed: true };
}

export interface RiskProfile {
  value: number;
  /** Weighted average expected yearly return, as a fraction. */
  expectedReturn: number;
  /** Estimated yearly volatility of the whole portfolio, as a fraction. */
  volatility: number;
  /** Volatility if every holding moved in lockstep (no diversification benefit). */
  undiversifiedVolatility: number;
  weights: { id: string; name: string; weight: number; cls: RiskClass; guessed: boolean }[];
  excluded: string[];
}

export function riskProfile(
  holdings: Holding[], base: string,
  assumptions: Record<RiskClass, Assumption> = DEFAULT_ASSUMPTIONS, correlation = DEFAULT_CORRELATION,
): RiskProfile {
  const priced = holdings.map((h) => ({ h, v: holdingValue(h, base) })).filter((x): x is { h: Holding; v: number } => x.v != null && x.v > 0);
  const excluded = holdings.filter((h) => !priced.some((p) => p.h.id === h.id)).map((h) => h.name);
  const value = priced.reduce((s, x) => s + x.v, 0);
  const weights = priced.map(({ h, v }) => ({ id: h.id, name: h.name, weight: value ? v / value : 0, ...riskClassOf(h) }));
  const mu = weights.reduce((s, w) => s + w.weight * assumptions[w.cls].returnPct / 100, 0);
  let variance = 0;
  let lockstep = 0;
  for (const a of weights) {
    const sa = assumptions[a.cls].volatilityPct / 100;
    lockstep += a.weight * sa;
    for (const b of weights) {
      const sb = assumptions[b.cls].volatilityPct / 100;
      // Cash is treated as uncorrelated with everything; bonds as weakly correlated with shares.
      const rho = a.id === b.id ? 1 : a.cls === "cash" || b.cls === "cash" ? 0 : a.cls === "bond" || b.cls === "bond" ? 0.2 : correlation;
      variance += a.weight * b.weight * sa * sb * rho;
    }
  }
  return { value, expectedReturn: mu, volatility: Math.sqrt(Math.max(variance, 0)), undiversifiedVolatility: lockstep, weights, excluded };
}

/** Small, fast, seedable random generator so projections are repeatable. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function normal(rand: () => number) {
  let u = 0;
  while (u === 0) u = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

export interface ProjectionPoint { year: number; p10: number; p50: number; p90: number; paidIn: number }
export interface Projection {
  points: ProjectionPoint[];
  /** Share of simulated futures ending below the total paid in, at the final year. */
  chanceBelowPaidIn: number;
  /** Share of simulated futures that were ever 20%+ below their running peak. */
  chanceOfBigDrop: number;
  paths: number;
}

/**
 * Simulates many possible futures (monthly steps, lognormal returns) and reports the 10th, 50th
 * and 90th percentile value each year. Percentiles are a range, not a prediction.
 */
export function project(opts: {
  start: number; monthly: number; expectedReturn: number; volatility: number; years: number; paths?: number; seed?: number;
}): Projection {
  const { start, monthly, expectedReturn, volatility, years } = opts;
  const paths = opts.paths ?? 2000;
  const rand = mulberry32(opts.seed ?? 42);
  const mMu = Math.log(1 + expectedReturn) / 12;
  const mSigma = volatility / Math.sqrt(12);
  const byYear: number[][] = Array.from({ length: years + 1 }, () => new Array(paths));
  let bigDrops = 0;
  for (let p = 0; p < paths; p++) {
    let v = start, peak = start, dropped = false;
    byYear[0][p] = v;
    for (let m = 1; m <= years * 12; m++) {
      v = v * Math.exp(mMu - (mSigma * mSigma) / 2 + mSigma * normal(rand)) + monthly;
      if (v > peak) peak = v;
      if (!dropped && peak > 0 && v < peak * 0.8) dropped = true;
      if (m % 12 === 0) byYear[m / 12][p] = v;
    }
    if (dropped) bigDrops++;
  }
  const q = (arr: number[], f: number) => arr[Math.min(arr.length - 1, Math.floor(f * arr.length))];
  const points = byYear.map((vals, year) => {
    const s = [...vals].sort((a, b) => a - b);
    return { year, p10: q(s, 0.1), p50: q(s, 0.5), p90: q(s, 0.9), paidIn: start + monthly * 12 * year };
  });
  const last = byYear[years];
  const paid = start + monthly * 12 * years;
  return { points, chanceBelowPaidIn: last.filter((v) => v < paid).length / paths, chanceOfBigDrop: bigDrops / paths, paths };
}

export interface TrialTrade {
  /** Add money to an existing holding, or create a hypothetical new one. */
  target: { kind: "existing"; holdingId: string } | { kind: "new"; name: string; assetType: AssetType; currency: string };
  amount: number;
  /** Where the money comes from: new money, or by selling part of another holding. */
  funding: { kind: "new_money" } | { kind: "sell"; holdingId: string };
}

/** Returns hypothetical holdings after the trade. Real holdings are never modified. */
export function applyTrial(holdings: Holding[], base: string, trade: TrialTrade): { holdings: Holding[]; error: string | null } {
  if (!(trade.amount > 0)) return { holdings, error: "Enter an amount above £0." };
  let next = holdings.map((h) => ({ ...h }));
  if (trade.funding.kind === "sell") {
    const id = trade.funding.holdingId;
    const src = next.find((h) => h.id === id);
    const v = src ? holdingValue(src, base) : null;
    if (!src || v == null) return { holdings, error: "That holding has no known value to sell from." };
    if (trade.amount > v + 1e-9) return { holdings, error: `You only hold about £${v.toFixed(2)} of ${src.name}.` };
    const frac = 1 - trade.amount / v;
    next = next.map((h) => (h.id === src.id ? { ...h, quantity: h.quantity * frac, costBasisBase: h.costBasisBase == null ? null : h.costBasisBase * frac } : h))
      .filter((h) => h.quantity > 1e-12);
  }
  if (trade.target.kind === "existing") {
    const id = trade.target.holdingId;
    const t = next.find((h) => h.id === id);
    if (!t) return { holdings, error: "Choose a holding to add to." };
    const unit = holdingValue({ ...t, quantity: 1 }, base);
    if (!unit) return { holdings, error: `${t.name} has no known price, so a purchase can't be simulated. Add a price or sync first.` };
    next = next.map((h) => (h.id === t.id ? { ...h, quantity: h.quantity + trade.amount / unit, costBasisBase: h.costBasisBase == null ? null : h.costBasisBase + trade.amount } : h));
  } else {
    if (!trade.target.name.trim()) return { holdings, error: "Give the new investment a name." };
    next.push({
      id: "trial-new", name: trade.target.name.trim(), ticker: null, isin: null, assetType: trade.target.assetType, sector: null, region: null,
      quantity: 1, instrumentCurrency: base, avgPrice: trade.amount, costBasisBase: trade.amount,
      lastPrice: trade.amount, lastPriceAt: null, lastPriceSource: null, fxRateToBase: null, source: "manual",
    });
    // Currency exposure for a new foreign investment: count its value under that currency.
    if (trade.target.currency !== base) {
      next[next.length - 1] = { ...next[next.length - 1], instrumentCurrency: trade.target.currency, fxRateToBase: 1 };
    }
  }
  return { holdings: next, error: null };
}
