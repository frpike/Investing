import { newId } from "@/lib/format";
import { holdingValue } from "@/lib/portfolio/metrics";
import type { Holding } from "@/lib/portfolio/types";
import { applyBrokerSync, ensurePortfolio } from "@/lib/store/actions";
import type { AppData, Change } from "@/lib/store/types";

export const CODE_KEY = "groundwork:t212-access-code";

export function savedCode(): string {
  try { return localStorage.getItem(CODE_KEY) ?? ""; } catch { return ""; }
}

export interface PersonalStatus { enabled: boolean; environment: "live" | "demo" | null; fileStorage: boolean }

export async function personalStatus(): Promise<PersonalStatus> {
  try {
    const s = await (await fetch("/api/broker/trading212", { cache: "no-store" })).json();
    return { enabled: !!s.enabled, environment: s.environment ?? null, fileStorage: !!s.fileStorage };
  } catch {
    return { enabled: false, environment: null, fileStorage: false };
  }
}

/** Fetches a read-only Trading 212 snapshot and applies it to the learner's data. */
export async function syncTrading212(
  code: string,
  apply: (t: (d: AppData) => [AppData, Change] | null) => Promise<AppData>,
): Promise<{ ok: true; count: number; cached: boolean; historyComplete: boolean } | { ok: false; error: string; status: number }> {
  const res = await fetch("/api/broker/trading212", { method: "POST", headers: { "x-access-code": code } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: body.error ?? "Sync failed.", status: res.status };
  const s = body.snapshot;
  await apply((d) => applyBrokerSync(d, {
    holdings: s.holdings,
    transactions: s.transactions,
    snapshot: {
      takenAt: s.fetchedAt, source: "api_trading212", environment: s.environment, totalValue: s.account.totalValue,
      invested: s.account.investedCost, cash: s.account.cash, historyComplete: s.historyComplete,
      holdings: (s.holdings as Holding[]).map((h) => ({ key: (h.isin ?? h.ticker ?? h.name).toUpperCase(), name: h.name, value: holdingValue(h, s.accountCurrency) })),
    },
  }, ensurePortfolio(d, newId(), new Date()).id, newId, new Date()));
  return { ok: true, count: s.holdings.length, cached: !!body.cached, historyComplete: !!s.historyComplete };
}
