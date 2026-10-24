import { describe, expect, it } from "vitest";
import { applyTrial, DEFAULT_ASSUMPTIONS, project, riskClassOf, riskProfile } from "./forecast";
import { summarize } from "./metrics";
import type { Holding } from "./types";

// Fictional holdings only.
const h = (over: Partial<Holding>): Holding => ({
  id: over.id ?? "h", name: "Fictional", ticker: null, isin: null, assetType: null, sector: null, region: null, quantity: 1,
  instrumentCurrency: "GBP", avgPrice: null, costBasisBase: null, lastPrice: 100, lastPriceAt: null, lastPriceSource: null,
  fxRateToBase: null, source: "manual", ...over,
});

describe("risk classes", () => {
  it("prefers the learner's label and otherwise guesses from the name", () => {
    expect(riskClassOf({ assetType: "share", name: "Fictional World Index Fund" })).toEqual({ cls: "single", guessed: false });
    expect(riskClassOf({ assetType: null, name: "Fictional FTSE All-World UCITS ETF" })).toEqual({ cls: "diversified", guessed: true });
    expect(riskClassOf({ assetType: null, name: "Fictional Gadgets, Inc." })).toEqual({ cls: "single", guessed: true });
  });
});

describe("risk profile", () => {
  it("weights returns and shows that spreading across holdings lowers volatility", () => {
    const two = riskProfile([h({ id: "a", assetType: "share" }), h({ id: "b", assetType: "share" })], "GBP");
    expect(two.expectedReturn).toBeCloseTo(0.06);
    expect(two.undiversifiedVolatility).toBeCloseTo(0.32);
    // σ = 0.32 × sqrt(0.5² + 0.5² + 2×0.5×0.5×0.6) = 0.32 × sqrt(0.8)
    expect(two.volatility).toBeCloseTo(0.32 * Math.sqrt(0.8));
    const one = riskProfile([h({ id: "a", assetType: "share", quantity: 2 })], "GBP");
    expect(one.volatility).toBeCloseTo(0.32);
  });

  it("leaves out holdings without a value and says so", () => {
    const r = riskProfile([h({ id: "a", assetType: "etf" }), h({ id: "b", name: "No price", lastPrice: null })], "GBP");
    expect(r.excluded).toEqual(["No price"]);
    expect(r.weights).toHaveLength(1);
    expect(r.volatility).toBeCloseTo(DEFAULT_ASSUMPTIONS.diversified.volatilityPct / 100);
  });
});

describe("projection", () => {
  it("is repeatable for a seed and orders percentiles low to high", () => {
    const a = project({ start: 1000, monthly: 150, expectedReturn: 0.06, volatility: 0.16, years: 10, paths: 800, seed: 7 });
    const b = project({ start: 1000, monthly: 150, expectedReturn: 0.06, volatility: 0.16, years: 10, paths: 800, seed: 7 });
    expect(a).toEqual(b);
    for (const p of a.points) expect(p.p10 <= p.p50 && p.p50 <= p.p90).toBe(true);
    expect(a.points[10].paidIn).toBe(1000 + 150 * 120);
  });

  it("matches the arithmetic when there is no volatility", () => {
    const r = project({ start: 1000, monthly: 0, expectedReturn: 0.05, volatility: 0, years: 20, paths: 10 });
    expect(r.points[20].p50).toBeCloseTo(1000 * 1.05 ** 20, 2);
    expect(r.points[20].p10).toBeCloseTo(r.points[20].p90, 6);
    expect(r.chanceBelowPaidIn).toBe(0);
  });

  it("gives a wider range and more chance of loss for riskier holdings", () => {
    const calm = project({ start: 1000, monthly: 0, expectedReturn: 0.06, volatility: 0.12, years: 5, paths: 2000 });
    const wild = project({ start: 1000, monthly: 0, expectedReturn: 0.06, volatility: 0.35, years: 5, paths: 2000 });
    expect(wild.points[5].p90 - wild.points[5].p10).toBeGreaterThan(calm.points[5].p90 - calm.points[5].p10);
    expect(wild.chanceBelowPaidIn).toBeGreaterThan(calm.chanceBelowPaidIn);
    expect(wild.chanceOfBigDrop).toBeGreaterThan(calm.chanceOfBigDrop);
  });
});

describe("trial purchases", () => {
  const holdings = [h({ id: "fund", name: "Fictional Fund", assetType: "etf", quantity: 9, lastPrice: 100, costBasisBase: 800 }), h({ id: "co", name: "Fictional Co", assetType: "share", quantity: 1, lastPrice: 100 })];

  it("adds new money to an existing holding at today's price, without touching the real list", () => {
    const r = applyTrial(holdings, "GBP", { target: { kind: "existing", holdingId: "co" }, amount: 200, funding: { kind: "new_money" } });
    expect(r.error).toBeNull();
    expect(r.holdings.find((x) => x.id === "co")!.quantity).toBeCloseTo(3);
    expect(holdings.find((x) => x.id === "co")!.quantity).toBe(1);
    expect(summarize({ baseCurrency: "GBP", holdings: r.holdings }).largest!.weight).toBeCloseTo(900 / 1200);
  });

  it("can fund a new investment by selling part of another, keeping the total the same", () => {
    const r = applyTrial(holdings, "GBP", { target: { kind: "new", name: "Fictional Bond Fund", assetType: "bond", currency: "GBP" }, amount: 300, funding: { kind: "sell", holdingId: "fund" } });
    expect(r.error).toBeNull();
    const s = summarize({ baseCurrency: "GBP", holdings: r.holdings });
    expect(s.totalValue).toBeCloseTo(1000);
    expect(r.holdings.find((x) => x.id === "fund")!.costBasisBase).toBeCloseTo(800 * (600 / 900));
    expect(riskProfile(r.holdings, "GBP").volatility).toBeLessThan(riskProfile(holdings, "GBP").volatility);
  });

  it("refuses impossible trades with a clear reason", () => {
    expect(applyTrial(holdings, "GBP", { target: { kind: "existing", holdingId: "co" }, amount: 0, funding: { kind: "new_money" } }).error).toMatch(/above £0/);
    expect(applyTrial(holdings, "GBP", { target: { kind: "existing", holdingId: "co" }, amount: 5000, funding: { kind: "sell", holdingId: "fund" } }).error).toMatch(/only hold/);
    expect(applyTrial([...holdings, h({ id: "np", lastPrice: null })], "GBP", { target: { kind: "existing", holdingId: "np" }, amount: 10, funding: { kind: "new_money" } }).error).toMatch(/no known price/);
  });
});
