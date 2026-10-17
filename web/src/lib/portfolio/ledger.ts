import type { Transaction } from "./types";

export interface LedgerSummary {
  deposits: number;
  withdrawals: number;
  dividends: number;
  fees: number;
  interest: number;
  /** Average-cost realised gain across all sales; null when sales can't be matched to buys. */
  realised: number | null;
  dividendHistory: { occurredAt: string; name: string; amount: number }[];
}

/** Totals from stored transactions (amounts in base currency), using average-cost pooling for sales. */
export function summarizeLedger(txs: Transaction[]): LedgerSummary {
  const out: LedgerSummary = { deposits: 0, withdrawals: 0, dividends: 0, fees: 0, interest: 0, realised: 0, dividendHistory: [] };
  const pools = new Map<string, { qty: number; cost: number }>();
  for (const t of [...txs].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))) {
    const amt = t.totalBase ?? 0;
    const key = t.isin ?? t.ticker ?? t.name ?? "?";
    if (t.kind === "buy" && t.quantity) {
      const p = pools.get(key) ?? { qty: 0, cost: 0 };
      p.qty += t.quantity; p.cost += amt; pools.set(key, p);
    } else if (t.kind === "sell" && t.quantity) {
      const p = pools.get(key);
      if (!p || t.quantity > p.qty + 1e-9) { out.realised = null; continue; }
      const removed = p.cost * (t.quantity / p.qty);
      if (out.realised != null) out.realised += amt - removed;
      p.cost -= removed; p.qty -= t.quantity;
    } else if (t.kind === "dividend") {
      out.dividends += amt;
      out.dividendHistory.push({ occurredAt: t.occurredAt, name: t.name ?? t.ticker ?? "Unknown", amount: amt });
    } else if (t.kind === "deposit") out.deposits += amt;
    else if (t.kind === "withdrawal") out.withdrawals += amt;
    else if (t.kind === "fee") out.fees += amt;
    else if (t.kind === "interest") out.interest += amt;
  }
  out.dividendHistory.reverse();
  return out;
}
