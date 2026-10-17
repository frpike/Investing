import { fxToBase, holdingValue } from "./metrics";
import type { Holding, Portfolio } from "./types";

// Hypothetical "what if" shocks applied to today's values. Results are illustrations only:
// real markets move many things at once, and nothing here predicts what will happen.

export type Scenario =
  | { kind: "holding"; holdingId: string; pct: number }
  | { kind: "sector"; sector: string; pct: number }
  | { kind: "assetType"; assetType: string; pct: number }
  /** pct = how much the base currency strengthens against `currency` (+10 = pound up 10% vs dollar). */
  | { kind: "fx"; currency: string; pct: number }
  | { kind: "dividend"; holdingId: string; perShare: number };

export interface ScenarioResult {
  before: number;
  after: number;
  change: number;
  changePct: number | null;
  cashAdded: number;
  perHolding: { id: string; name: string; before: number; after: number }[];
  excluded: string[];
}

export function applyScenarios(p: Pick<Portfolio, "baseCurrency" | "holdings">, scenarios: Scenario[]): ScenarioResult {
  const base = p.baseCurrency;
  const perHolding: ScenarioResult["perHolding"] = [];
  const excluded: string[] = [];
  let cashAdded = 0;

  for (const h of p.holdings) {
    const before = holdingValue(h, base);
    if (before == null) { excluded.push(h.name); continue; }
    let price = h.lastPrice!;
    let fx = fxToBase(h, base)!;
    for (const s of scenarios) {
      if (s.kind === "holding" && s.holdingId === h.id) price *= 1 + s.pct / 100;
      if (s.kind === "sector" && sameLabel(h.sector, s.sector)) price *= 1 + s.pct / 100;
      if (s.kind === "assetType" && h.assetType === s.assetType) price *= 1 + s.pct / 100;
      if (s.kind === "fx" && currencyOf(h) === s.currency && s.currency !== base) fx /= 1 + s.pct / 100;
      if (s.kind === "dividend" && s.holdingId === h.id) cashAdded += h.quantity * s.perShare * fx;
    }
    perHolding.push({ id: h.id, name: h.name, before, after: h.quantity * price * fx });
  }
  const before = perHolding.reduce((s, x) => s + x.before, 0);
  const after = perHolding.reduce((s, x) => s + x.after, 0) + cashAdded;
  return { before, after, change: after - before, changePct: before > 0 ? (after - before) / before : null, cashAdded, perHolding, excluded };
}

const sameLabel = (a: string | null, b: string) => !!a && a.trim().toLowerCase() === b.trim().toLowerCase();
const currencyOf = (h: Holding) => (h.instrumentCurrency === "GBX" ? "GBP" : h.instrumentCurrency);
