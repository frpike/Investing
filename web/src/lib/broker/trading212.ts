import "server-only";
import type { Holding, Transaction } from "@/lib/portfolio/types";

// Read-only Trading 212 connection for the owner's own account ("personal mode").
// Trading 212's API terms allow personal use; offering this to other users needs their
// written consent (docs/PLAN.md §2), so it is switched on only by the deployment owner's
// environment variables and protected by an access code.

export interface T212Config {
  apiKey: string;
  apiSecret: string | null;
  baseUrl: string;
  environment: "live" | "demo";
  accessCode: string;
}

export function personalModeConfig(env: NodeJS.ProcessEnv = process.env): T212Config | null {
  const apiKey = env.T212_API_KEY?.trim();
  const accessCode = env.T212_ACCESS_CODE?.trim();
  if (!apiKey || !accessCode || accessCode.length < 8) return null;
  const environment = env.T212_ENV === "demo" ? "demo" : "live";
  return {
    apiKey,
    apiSecret: env.T212_API_SECRET?.trim() || null,
    environment,
    baseUrl: env.T212_BASE_URL?.trim() || `https://${environment}.trading212.com`,
    accessCode,
  };
}

export class T212Error extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

type Fetch = typeof fetch;

async function get<T>(cfg: T212Config, path: string, fetchImpl: Fetch): Promise<T> {
  const auth = cfg.apiSecret ? `Basic ${Buffer.from(`${cfg.apiKey}:${cfg.apiSecret}`).toString("base64")}` : cfg.apiKey;
  const res = await fetchImpl(cfg.baseUrl + path, { headers: { Authorization: auth, Accept: "application/json" }, cache: "no-store" });
  if (res.status === 401) throw new T212Error("Trading 212 rejected the API key. Check T212_API_KEY and T212_API_SECRET.", 401);
  if (res.status === 403) throw new T212Error(`The API key is missing a permission needed for ${path.split("?")[0]}. Enable read-only account, portfolio and history permissions.`, 403);
  if (res.status === 429) throw new T212Error("Trading 212's rate limit was hit. Wait a minute and sync again.", 429);
  if (!res.ok) throw new T212Error(`Trading 212 returned ${res.status} for ${path.split("?")[0]}.`, 502);
  return res.json() as Promise<T>;
}

async function paged<T>(cfg: T212Config, first: string, fetchImpl: Fetch, maxPages: number): Promise<{ items: T[]; complete: boolean }> {
  const items: T[] = [];
  let next: string | null = first;
  let pages = 0;
  while (next && pages < maxPages) {
    const page: { items?: T[]; nextPagePath?: string | null } = await get(cfg, next, fetchImpl);
    items.push(...(page.items ?? []));
    next = page.nextPagePath ? (page.nextPagePath.startsWith("/api/") ? page.nextPagePath : `/api/v0/${page.nextPagePath.replace(/^\//, "")}`) : null;
    pages++;
  }
  return { items, complete: next == null };
}

// Response shapes, from docs.trading212.com (checked 17 Oct 2026). Every field is optional
// here because the API is in beta; missing values become null, never zero.
interface Summary {
  currency?: string;
  totalValue?: number;
  cash?: { availableToTrade?: number; inPies?: number; reservedForOrders?: number };
  investments?: { currentValue?: number; totalCost?: number; realizedProfitLoss?: number; unrealizedProfitLoss?: number };
}
interface Position {
  averagePricePaid?: number; createdAt?: string; currentPrice?: number; quantity?: number;
  instrument?: { currency?: string; isin?: string; name?: string; ticker?: string };
  walletImpact?: { currency?: string; currentValue?: number; totalCost?: number; unrealizedProfitLoss?: number; fxImpact?: number | null };
}
interface TxItem { amount?: number; currency?: string; dateTime?: string; reference?: string; type?: string }
interface DivItem { amount?: number; currency?: string; paidOn?: string; reference?: string; ticker?: string; quantity?: number; instrument?: { name?: string; isin?: string; ticker?: string } }

export interface T212Snapshot {
  fetchedAt: string;
  environment: "live" | "demo";
  accountCurrency: string;
  account: { totalValue: number | null; cash: number | null; investedValue: number | null; investedCost: number | null; realised: number | null; unrealised: number | null };
  holdings: Holding[];
  transactions: Transaction[];
  historyComplete: boolean;
}

const n = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const ISIN = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/;

export function normalize(summary: Summary, positions: Position[], txs: TxItem[], divs: DivItem[], env: "live" | "demo", now: Date, historyComplete: boolean): T212Snapshot {
  const base = (summary.currency ?? "GBP").toUpperCase();
  const fetchedAt = now.toISOString();
  const holdings = positions
    .filter((p) => (p.quantity ?? 0) > 0 && (p.instrument?.ticker || p.instrument?.isin))
    .map((p): Holding => {
      const ins = p.instrument ?? {};
      const currency = (ins.currency ?? base).toUpperCase();
      const price = n(p.currentPrice);
      const qty = p.quantity!;
      const value = n(p.walletImpact?.currentValue);
      // Rate implied by Trading 212's own valuation: account-currency value ÷ (quantity × price).
      const sameCurrency = currency === base || (currency === "GBX" && base === "GBP");
      const fx = !sameCurrency && value != null && price ? value / (qty * price) : null;
      const isin = ins.isin && ISIN.test(ins.isin) ? ins.isin : null;
      return {
        id: `t212api-${isin ?? ins.ticker}`,
        name: ins.name || ins.ticker || "Unknown instrument",
        ticker: ins.ticker ?? null,
        isin,
        assetType: null, sector: null, region: null,
        quantity: qty,
        instrumentCurrency: currency,
        avgPrice: n(p.averagePricePaid),
        costBasisBase: n(p.walletImpact?.totalCost),
        lastPrice: price,
        lastPriceAt: price != null ? fetchedAt : null,
        lastPriceSource: price != null ? "api_trading212" : null,
        fxRateToBase: fx,
        source: "api_trading212",
      };
    });

  const kinds: Record<string, Transaction["kind"]> = {
    DEPOSIT: "deposit", WITHDRAW: "withdrawal", FEE: "fee", INTEREST_ON_FREE_CASH: "interest", LENDING_INTEREST: "interest", TRANSFER: "other",
  };
  const transactions: Transaction[] = [
    ...txs.filter((t) => t.dateTime && t.type && n(t.amount) != null).map((t): Transaction => ({
      id: `t212api-tx-${t.reference ?? `${t.type}|${t.dateTime}|${t.amount}`}`,
      kind: kinds[t.type!] ?? "other", occurredAt: new Date(t.dateTime!).toISOString(),
      ticker: null, isin: null, name: null, quantity: null, price: null, priceCurrency: null,
      totalBase: Math.abs(t.amount!), baseCurrency: (t.currency ?? base).toUpperCase(), withholdingTax: null,
      externalRef: `t212api:${t.reference ?? `${t.type}|${t.dateTime}|${t.amount}`}`, source: "api_trading212",
    })),
    ...divs.filter((d) => d.paidOn && n(d.amount) != null).map((d): Transaction => ({
      id: `t212api-div-${d.reference ?? `${d.ticker}|${d.paidOn}|${d.amount}`}`,
      kind: "dividend", occurredAt: new Date(d.paidOn!).toISOString(),
      ticker: d.ticker ?? d.instrument?.ticker ?? null, isin: d.instrument?.isin && ISIN.test(d.instrument.isin) ? d.instrument.isin : null,
      name: d.instrument?.name ?? d.ticker ?? null, quantity: n(d.quantity), price: null, priceCurrency: null,
      totalBase: d.amount!, baseCurrency: (d.currency ?? base).toUpperCase(), withholdingTax: null,
      externalRef: `t212api:div:${d.reference ?? `${d.ticker}|${d.paidOn}|${d.amount}`}`, source: "api_trading212",
    })),
  ];

  return {
    fetchedAt, environment: env, accountCurrency: base, historyComplete,
    account: {
      totalValue: n(summary.totalValue), cash: n(summary.cash?.availableToTrade),
      investedValue: n(summary.investments?.currentValue), investedCost: n(summary.investments?.totalCost),
      realised: n(summary.investments?.realizedProfitLoss), unrealised: n(summary.investments?.unrealizedProfitLoss),
    },
    holdings, transactions,
  };
}

/** Fetches a read-only snapshot. Never calls any order endpoint. */
export async function fetchSnapshot(cfg: T212Config, fetchImpl: Fetch = fetch, now = new Date()): Promise<T212Snapshot> {
  const summary = await get<Summary>(cfg, "/api/v0/equity/account/summary", fetchImpl);
  const positions = await get<Position[]>(cfg, "/api/v0/equity/positions", fetchImpl);
  const txs = await paged<TxItem>(cfg, "/api/v0/equity/history/transactions?limit=50", fetchImpl, 10);
  const divs = await paged<DivItem>(cfg, "/api/v0/equity/history/dividends?limit=50", fetchImpl, 10);
  return normalize(summary, Array.isArray(positions) ? positions : [], txs.items, divs.items, cfg.environment, now, txs.complete && divs.complete);
}
