import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { applyBrokerSync } from "@/lib/store/actions";
import { emptyData } from "@/lib/store/types";
import { summarize } from "@/lib/portfolio/metrics";
import { fetchSnapshot, personalModeConfig, T212Error } from "./trading212";

// Fictional account data shaped like Trading 212's documented responses.
const fx = JSON.parse(readFileSync(new URL("../__fixtures__/t212-api-fictional.json", import.meta.url), "utf8"));
const cfg = personalModeConfig({ T212_API_KEY: "key", T212_API_SECRET: "secret", T212_ACCESS_CODE: "long-enough-code", T212_ENV: "demo", T212_BASE_URL: "https://t212.test" } as unknown as NodeJS.ProcessEnv)!;

function mockFetch(overrides: Record<string, Response> = {}) {
  const calls: { url: string; auth: string | null; method: string }[] = [];
  let txPage = 0;
  const impl = (async (url: string, init?: RequestInit) => {
    const auth = new Headers(init?.headers).get("authorization");
    calls.push({ url, auth, method: init?.method ?? "GET" });
    const path = url.replace("https://t212.test", "");
    for (const [k, v] of Object.entries(overrides)) if (path.startsWith(k)) return v;
    const body = path.startsWith("/api/v0/equity/account/summary") ? fx.summary
      : path.startsWith("/api/v0/equity/positions") ? fx.positions
      : path.startsWith("/api/v0/equity/history/transactions") ? fx.transactions[txPage++]
      : path.startsWith("/api/v0/equity/history/dividends") ? fx.dividends[0]
      : null;
    return body ? Response.json(body) : new Response("not found", { status: 404 });
  }) as unknown as typeof fetch;
  return { impl, calls };
}

describe("personal mode config", () => {
  it("is off without a key or with a short access code", () => {
    expect(personalModeConfig({} as unknown as NodeJS.ProcessEnv)).toBeNull();
    expect(personalModeConfig({ T212_API_KEY: "k", T212_ACCESS_CODE: "short" } as unknown as NodeJS.ProcessEnv)).toBeNull();
    expect(personalModeConfig({ T212_API_KEY: "k", T212_ACCESS_CODE: "12345678" } as unknown as NodeJS.ProcessEnv)?.baseUrl).toBe("https://live.trading212.com");
  });
});

describe("Trading 212 snapshot", () => {
  it("uses Basic auth, follows pagination and only makes read-only GET calls", async () => {
    const { impl, calls } = mockFetch();
    await fetchSnapshot(cfg, impl, new Date("2026-10-19T09:00:00Z"));
    expect(calls.every((c) => c.method === "GET")).toBe(true);
    expect(calls.every((c) => !/orders?(\b|\/)|\/pies/.test(c.url.replace("/history/", "/")))).toBe(true);
    expect(calls[0].auth).toBe(`Basic ${Buffer.from("key:secret").toString("base64")}`);
    expect(calls.filter((c) => c.url.includes("transactions"))).toHaveLength(2);
  });

  it("maps positions to holdings with prices, costs and an implied exchange rate", async () => {
    const s = await fetchSnapshot(cfg, mockFetch().impl, new Date("2026-10-19T09:00:00Z"));
    expect(s.holdings).toHaveLength(2);
    const fund = s.holdings.find((h) => h.isin === "IEFAKE000001")!;
    expect(fund.instrumentCurrency).toBe("GBX");
    expect(fund.fxRateToBase).toBeNull();
    expect(fund.costBasisBase).toBe(294);
    expect(fund.lastPriceAt).toBe("2026-10-19T09:00:00.000Z");
    const usd = s.holdings.find((h) => h.isin === "USFAKE000002")!;
    expect(usd.fxRateToBase).toBeCloseTo(0.8);
    // Our own valuation of the synced holdings matches Trading 212's.
    expect(summarize({ baseCurrency: "GBP", holdings: s.holdings }).totalValue).toBeCloseTo(390);
    expect(s.account.totalValue).toBe(412.5);
    expect(s.transactions.map((t) => t.kind).sort()).toEqual(["deposit", "deposit", "dividend", "interest"]);
    expect(s.historyComplete).toBe(true);
  });

  it("explains a missing permission instead of failing silently", async () => {
    const { impl } = mockFetch({ "/api/v0/equity/positions": new Response("", { status: 403 }) });
    await expect(fetchSnapshot(cfg, impl)).rejects.toThrow(T212Error);
    await expect(fetchSnapshot(cfg, mockFetch({ "/api/v0/equity/positions": new Response("", { status: 403 }) }).impl)).rejects.toThrow(/permission/);
  });

  it("merges a sync into the portfolio, keeps labels and doesn't duplicate transactions", async () => {
    const s = await fetchSnapshot(cfg, mockFetch().impl, new Date("2026-10-19T09:00:00Z"));
    let id = 0;
    const newId = () => `00000000-0000-4000-8000-${String(++id).padStart(12, "0")}`;
    const snap = { takenAt: s.fetchedAt, source: "api_trading212" as const, environment: s.environment, totalValue: 412.5, invested: 370, cash: 22.5, historyComplete: true };
    let [data] = applyBrokerSync(emptyData(), { holdings: s.holdings, transactions: s.transactions, snapshot: snap }, "p1", newId, new Date());
    const fundId = data.portfolio!.holdings.find((h) => h.isin === "IEFAKE000001")!.id;
    data = { ...data, portfolio: { ...data.portfolio!, holdings: data.portfolio!.holdings.map((h) => (h.id === fundId ? { ...h, sector: "Global" } : h)) } };
    [data] = applyBrokerSync(data, { holdings: s.holdings, transactions: s.transactions, snapshot: snap }, "p1", newId, new Date());
    expect(data.portfolio!.holdings).toHaveLength(2);
    const fund = data.portfolio!.holdings.find((h) => h.isin === "IEFAKE000001")!;
    expect(fund.id).toBe(fundId);
    expect(fund.sector).toBe("Global");
    expect(data.portfolio!.transactions).toHaveLength(4);
    expect(data.snapshots).toHaveLength(2);
  });
});
