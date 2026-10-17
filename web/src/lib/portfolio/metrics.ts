import type { Holding, Portfolio } from "./types";

const DAY = 86_400_000;
export const STALE_AFTER_DAYS = 7;

/** Base-currency units per 1 unit of the holding's price currency, or null if unknown. */
export function fxToBase(h: Pick<Holding, "instrumentCurrency" | "fxRateToBase">, base: string): number | null {
  if (h.instrumentCurrency === base) return 1;
  if (h.instrumentCurrency === "GBX" && base === "GBP") return 0.01; // London prices quoted in pence
  return h.fxRateToBase;
}

export function holdingValue(h: Holding, base: string): number | null {
  const fx = fxToBase(h, base);
  if (h.lastPrice == null || fx == null) return null;
  return h.quantity * h.lastPrice * fx;
}

export function holdingCost(h: Holding, base: string): number | null {
  if (h.costBasisBase != null) return h.costBasisBase;
  const fx = fxToBase(h, base);
  // Only derive cost from the average price when no currency conversion is involved:
  // today's FX rate would misstate what was actually paid.
  if (h.avgPrice == null || fx == null || (fx !== 1 && fx !== 0.01)) return null;
  return h.quantity * h.avgPrice * fx;
}

export interface Slice { label: string; value: number; weight: number }

export interface PortfolioSummary {
  base: string;
  /** Null unless every holding has a known value. */
  totalValue: number | null;
  /** Sum over holdings whose value is known. */
  pricedValue: number;
  unpriced: { id: string; name: string; reason: "no_price" | "no_fx" }[];
  invested: number | null;
  unrealised: { amount: number; pct: number | null; holdingsCounted: number; holdingsTotal: number } | null;
  allocation: (Slice & { id: string })[];
  largest: (Slice & { id: string }) | null;
  /** Sum of squared weights: 1 = everything in one holding. */
  concentrationIndex: number | null;
  /** 1 ÷ concentration index: how many equal-sized holdings the portfolio behaves like. */
  effectiveHoldings: number | null;
  byCurrency: Slice[];
  byAssetType: Slice[];
  bySector: Slice[];
  byRegion: Slice[];
  stale: { id: string; name: string; lastPriceAt: string }[];
  oldestPriceAt: string | null;
}

export const METHODS: Record<string, string> = {
  totalValue: "Sum of quantity × latest price × exchange rate to pounds, for every holding. If any holding has no price, the total is shown as unknown rather than guessed.",
  invested: "Sum of what each holding cost in pounds. Comes from your import (the 'Total' column of buys, reduced proportionally when you sold) or from what you entered.",
  unrealised: "Current value minus cost, only for holdings where both are known. 'Unrealised' means you haven't sold, so the gain or loss isn't locked in.",
  allocation: "Each holding's value divided by the total value of priced holdings.",
  concentration: "Sum of each holding's weight squared. 100% in one holding gives 1.0; ten equal holdings give 0.1. 'Behaves like N holdings' is 1 ÷ that number.",
  currency: "Weights grouped by the currency each holding is priced in. Pence (GBX) count as pounds. A holding priced in dollars rises or falls in pounds when the exchange rate moves, even if its price doesn't.",
  sector: "Weights grouped by the sector or region label you gave each holding. Funds hold many sectors inside them, so this is a rough view.",
};

export function summarize(p: Pick<Portfolio, "baseCurrency" | "holdings">, now = new Date()): PortfolioSummary {
  const base = p.baseCurrency;
  const unpriced: PortfolioSummary["unpriced"] = [];
  const priced: { h: Holding; value: number }[] = [];
  for (const h of p.holdings) {
    const v = holdingValue(h, base);
    if (v == null) unpriced.push({ id: h.id, name: h.name, reason: h.lastPrice == null ? "no_price" : "no_fx" });
    else priced.push({ h, value: v });
  }
  const pricedValue = priced.reduce((s, x) => s + x.value, 0);
  const costs = p.holdings.map((h) => holdingCost(h, base));
  const invested = costs.every((c) => c != null) && costs.length ? costs.reduce((s, c) => s + c!, 0) : null;

  let unrealised: PortfolioSummary["unrealised"] = null;
  const both = priced.map((x) => ({ value: x.value, cost: holdingCost(x.h, base) })).filter((x) => x.cost != null);
  if (both.length) {
    const amount = both.reduce((s, x) => s + x.value - x.cost!, 0);
    const cost = both.reduce((s, x) => s + x.cost!, 0);
    unrealised = { amount, pct: cost > 0 ? amount / cost : null, holdingsCounted: both.length, holdingsTotal: p.holdings.length };
  }

  const allocation = priced
    .map((x) => ({ id: x.h.id, label: x.h.name, value: x.value, weight: pricedValue > 0 ? x.value / pricedValue : 0 }))
    .sort((a, b) => b.value - a.value);
  const ci = pricedValue > 0 ? allocation.reduce((s, a) => s + a.weight ** 2, 0) : null;

  const group = (key: (h: Holding) => string): Slice[] => {
    const m = new Map<string, number>();
    for (const x of priced) m.set(key(x.h), (m.get(key(x.h)) ?? 0) + x.value);
    return [...m].map(([label, value]) => ({ label, value, weight: pricedValue > 0 ? value / pricedValue : 0 }))
      .sort((a, b) => b.value - a.value);
  };

  const stale = p.holdings
    .filter((h) => h.lastPriceAt && now.getTime() - Date.parse(h.lastPriceAt) > STALE_AFTER_DAYS * DAY)
    .map((h) => ({ id: h.id, name: h.name, lastPriceAt: h.lastPriceAt! }));
  const priceDates = p.holdings.map((h) => h.lastPriceAt).filter((d): d is string => !!d).sort();

  return {
    base,
    totalValue: unpriced.length || !p.holdings.length ? (p.holdings.length ? null : 0) : pricedValue,
    pricedValue,
    unpriced,
    invested,
    unrealised,
    allocation,
    largest: allocation[0] ?? null,
    concentrationIndex: ci,
    effectiveHoldings: ci ? 1 / ci : null,
    byCurrency: group((h) => (h.instrumentCurrency === "GBX" ? "GBP" : h.instrumentCurrency)),
    byAssetType: group((h) => h.assetType ?? "not labelled"),
    bySector: group((h) => h.sector?.trim() || "Not labelled"),
    byRegion: group((h) => h.region?.trim() || "Not labelled"),
    stale,
    oldestPriceAt: priceDates[0] ?? null,
  };
}
