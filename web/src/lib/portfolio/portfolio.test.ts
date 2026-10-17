import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseCsv } from "./csv";
import { importTrading212Csv } from "./import-trading212";
import { fxToBase, holdingCost, holdingValue, summarize } from "./metrics";
import { applyScenarios } from "./scenarios";
import type { Holding } from "./types";

// All holdings below are fictional test data.
const h = (over: Partial<Holding>): Holding => ({
  id: over.id ?? over.name ?? "h", name: "Fictional", ticker: null, isin: null, assetType: null, sector: null, region: null,
  quantity: 1, instrumentCurrency: "GBP", avgPrice: null, costBasisBase: null, lastPrice: null, lastPriceAt: null,
  lastPriceSource: null, fxRateToBase: null, source: "manual", ...over,
});
const now = new Date("2026-10-17T12:00:00Z");

describe("currency handling", () => {
  it("treats pence (GBX) as 1/100 of a pound", () => {
    expect(fxToBase({ instrumentCurrency: "GBX", fxRateToBase: null }, "GBP")).toBe(0.01);
    expect(holdingValue(h({ quantity: 10, lastPrice: 250, instrumentCurrency: "GBX" }), "GBP")).toBeCloseTo(25);
  });

  it("returns unknown, not zero, when a foreign holding has no exchange rate", () => {
    expect(holdingValue(h({ lastPrice: 100, instrumentCurrency: "USD" }), "GBP")).toBeNull();
    expect(holdingValue(h({ lastPrice: 100, instrumentCurrency: "USD", fxRateToBase: 0.8, quantity: 2 }), "GBP")).toBeCloseTo(160);
  });

  it("doesn't derive a foreign holding's cost from today's exchange rate", () => {
    expect(holdingCost(h({ avgPrice: 100, instrumentCurrency: "USD", fxRateToBase: 0.8 }), "GBP")).toBeNull();
    expect(holdingCost(h({ avgPrice: 100, quantity: 2 }), "GBP")).toBe(200);
    expect(holdingCost(h({ costBasisBase: 150, instrumentCurrency: "USD" }), "GBP")).toBe(150);
  });
});

describe("portfolio summary", () => {
  const holdings = [
    h({ id: "a", name: "Fund A", quantity: 10, lastPrice: 10, lastPriceAt: "2026-10-16T00:00:00Z", costBasisBase: 90, assetType: "etf", sector: "Global" }),
    h({ id: "b", name: "Share B", quantity: 5, lastPrice: 20, lastPriceAt: "2026-10-01T00:00:00Z", costBasisBase: 120, assetType: "share", sector: "Tech", instrumentCurrency: "USD", fxRateToBase: 0.5 }),
    h({ id: "c", name: "Share C", quantity: 3, lastPrice: null, costBasisBase: 30 }),
  ];
  const s = summarize({ baseCurrency: "GBP", holdings }, now);

  it("shows total value as unknown when any holding lacks a price", () => {
    expect(s.totalValue).toBeNull();
    expect(s.pricedValue).toBeCloseTo(150);
    expect(s.unpriced).toEqual([{ id: "c", name: "Share C", reason: "no_price" }]);
  });

  it("computes unrealised gain only over holdings where value and cost are both known", () => {
    expect(s.unrealised!.amount).toBeCloseTo(150 - 210);
    expect(s.unrealised!.holdingsCounted).toBe(2);
    expect(s.unrealised!.holdingsTotal).toBe(3);
    expect(s.invested).toBe(240);
  });

  it("computes weights, concentration and exposures", () => {
    expect(s.largest!.label).toBe("Fund A");
    expect(s.largest!.weight).toBeCloseTo(100 / 150);
    expect(s.concentrationIndex).toBeCloseTo((2 / 3) ** 2 + (1 / 3) ** 2);
    expect(s.effectiveHoldings).toBeCloseTo(1.8);
    expect(s.byCurrency.map((x) => x.label)).toEqual(["GBP", "USD"]);
    expect(s.bySector.find((x) => x.label === "Tech")!.weight).toBeCloseTo(1 / 3);
  });

  it("flags prices older than a week", () => {
    expect(s.stale.map((x) => x.id)).toEqual(["b"]);
    expect(s.oldestPriceAt).toBe("2026-10-01T00:00:00Z");
  });

  it("gives an empty portfolio a zero total and no ratios", () => {
    const e = summarize({ baseCurrency: "GBP", holdings: [] }, now);
    expect(e.totalValue).toBe(0);
    expect(e.concentrationIndex).toBeNull();
    expect(e.unrealised).toBeNull();
  });
});

describe("hypothetical scenarios", () => {
  const holdings = [
    h({ id: "a", name: "UK fund", quantity: 10, lastPrice: 10, sector: "Global", lastPriceAt: "2026-10-16T00:00:00Z" }),
    h({ id: "b", name: "US share", quantity: 1, lastPrice: 100, instrumentCurrency: "USD", fxRateToBase: 0.8, sector: "Tech", lastPriceAt: "2026-10-16T00:00:00Z" }),
    h({ id: "c", name: "No price", quantity: 1 }),
  ];
  const p = { baseCurrency: "GBP", holdings };

  it("applies a fall to one holding", () => {
    const r = applyScenarios(p, [{ kind: "holding", holdingId: "b", pct: -10 }]);
    expect(r.before).toBeCloseTo(180);
    expect(r.after).toBeCloseTo(172);
    expect(r.excluded).toEqual(["No price"]);
  });

  it("applies a sector move by label, case-insensitively", () => {
    expect(applyScenarios(p, [{ kind: "sector", sector: "tech", pct: -15 }]).change).toBeCloseTo(-12);
  });

  it("lowers dollar holdings in pounds when the pound strengthens", () => {
    const r = applyScenarios(p, [{ kind: "fx", currency: "USD", pct: 10 }]);
    expect(r.perHolding.find((x) => x.id === "b")!.after).toBeCloseTo(80 / 1.1);
    expect(r.perHolding.find((x) => x.id === "a")!.after).toBeCloseTo(100);
  });

  it("adds dividends as cash, converted to pounds", () => {
    const r = applyScenarios(p, [{ kind: "dividend", holdingId: "b", perShare: 2 }]);
    expect(r.cashAdded).toBeCloseTo(1.6);
    expect(r.change).toBeCloseTo(1.6);
  });

  it("combines moves: one up 5%, another down 5%", () => {
    const r = applyScenarios(p, [{ kind: "holding", holdingId: "a", pct: 5 }, { kind: "holding", holdingId: "b", pct: -5 }]);
    expect(r.change).toBeCloseTo(5 - 4);
  });
});

describe("CSV parsing", () => {
  it("handles quotes, embedded commas, escaped quotes, CRLF and a BOM", () => {
    expect(parseCsv('﻿a,b\r\n"x, y","say ""hi"""\r\n')).toEqual([["a", "b"], ["x, y", 'say "hi"']]);
  });
  it("skips blank lines", () => {
    expect(parseCsv("a\n\n\nb\n")).toEqual([["a"], ["b"]]);
  });
});

describe("Trading 212 import (fictional export)", () => {
  const text = readFileSync(new URL("../__fixtures__/trading212-fictional.csv", import.meta.url), "utf8");
  const r = importTrading212Csv(text);

  it("rebuilds holdings with average-cost pooling", () => {
    expect(r.ok).toBe(true);
    const fund = r.holdings.find((x) => x.ticker === "FAKEW")!;
    expect(fund.quantity).toBe(2);
    expect(fund.costBasisBase).toBeCloseTo(310 * (2 / 3), 3);
    expect(fund.avgPrice).toBeCloseTo((2 * 100 + 110) / 3, 6);
    const gadget = r.holdings.find((x) => x.ticker === "FAKE")!;
    expect(gadget.instrumentCurrency).toBe("USD");
    expect(gadget.costBasisBase).toBeCloseTo(80.5);
  });

  it("leaves current prices unknown, because the export doesn't contain them", () => {
    expect(r.holdings.every((x) => x.lastPrice === null && x.lastPriceAt === null)).toBe(true);
  });

  it("works out realised gains, dividends and deposits", () => {
    expect(r.realisedTotal).toBeCloseTo(120 - 310 / 3, 3);
    expect(r.dividendsTotal).toBeCloseTo(0.1);
    expect(r.depositsTotal).toBe(500);
  });

  it("skips duplicates and reports unreadable rows instead of guessing", () => {
    expect(r.warnings.some((w) => /duplicate/.test(w))).toBe(true);
    expect(r.errors).toEqual([{ row: 9, message: 'Unrecognised action "Mystery action".' }]);
    expect(r.rowsTotal).toBe(8);
    expect(r.rowsImported).toBe(6);
  });

  it("rejects files that aren't Trading 212 exports", () => {
    const bad = importTrading212Csv("Date,Amount\n2026-01-01,5\n");
    expect(bad.ok).toBe(false);
    expect(bad.errors[0].message).toMatch(/Missing column/);
  });

  it("rejects empty files and oversized files", () => {
    expect(importTrading212Csv("").errors[0].message).toMatch(/empty/);
    expect(importTrading212Csv(text, 3).errors[0].message).toMatch(/more than 3 rows/);
  });

  it("marks cost unknown when sales exceed the buys in the file", () => {
    const partial = importTrading212Csv(
      "Action,Time,Ticker,Name,No. of shares,Total,Currency (Total)\n" +
      "Market buy,2026-01-01 10:00:00,ZZZ,Fictional Z,1,10,GBP\n" +
      "Market sell,2026-02-01 10:00:00,ZZZ,Fictional Z,3,36,GBP\n" +
      "Market buy,2026-03-01 10:00:00,ZZZ,Fictional Z,2,24,GBP\n",
    );
    const z = partial.holdings[0];
    expect(z.quantity).toBe(2);
    expect(z.costBasisBase).toBeNull();
    expect(partial.warnings.join(" ")).toMatch(/history may be missing/);
  });
});

describe("ledger", async () => {
  const { summarizeLedger } = await import("./ledger");
  const text = readFileSync(new URL("../__fixtures__/trading212-fictional.csv", import.meta.url), "utf8");
  const r = importTrading212Csv(text);
  it("matches the importer's realised gain and dividend totals", () => {
    const l = summarizeLedger(r.transactions);
    expect(l.realised).toBeCloseTo(r.realisedTotal, 3); // importer rounds to 4dp
    expect(l.dividends).toBeCloseTo(r.dividendsTotal, 6);
    expect(l.deposits).toBe(500);
    expect(l.dividendHistory[0].name).toBe("Fictional Gadgets, Inc.");
  });
  it("returns unknown realised gains when sales can't be matched to buys", () => {
    const l = summarizeLedger([{ id: "1", kind: "sell", occurredAt: "2026-01-01", ticker: "Z", isin: null, name: "Z", quantity: 1, price: null, priceCurrency: null, totalBase: 10, baseCurrency: "GBP", withholdingTax: null, externalRef: null, source: "manual" }]);
    expect(l.realised).toBeNull();
  });
});
