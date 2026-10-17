import { parseCsv } from "./csv";
import type { Holding, Transaction } from "./types";

// Imports a Trading 212 history export (CSV). Columns are found by header name, so their
// order doesn't matter. Written from the export layout as documented by users; verify with
// a real file. Costs come from the "Total" column (in account currency), so no exchange-rate
// assumptions are needed. Current prices are NOT in the export, so imported holdings have
// an unknown value until the user adds a price.

const COLUMNS = {
  action: /^action$/,
  time: /^time$/,
  isin: /^isin$/,
  ticker: /^ticker$/,
  name: /^name$/,
  shares: /^no\.? of shares$/,
  price: /^price \/ share$/,
  priceCurrency: /^currency \(price \/ share\)$/,
  total: /^total$/,
  totalCurrency: /^currency \(total\)$/,
  withholding: /^withholding tax$/,
  id: /^id$/,
} as const;
type Col = keyof typeof COLUMNS;
const REQUIRED: Col[] = ["action", "time", "total"];

export interface ImportIssue { row: number; message: string }

export interface ImportResult {
  ok: boolean;
  baseCurrency: string;
  holdings: Holding[];
  transactions: Transaction[];
  realisedByInstrument: Record<string, number>;
  realisedTotal: number;
  dividendsTotal: number;
  withholdingTotal: number;
  depositsTotal: number;
  withdrawalsTotal: number;
  feesTotal: number;
  interestTotal: number;
  rowsTotal: number;
  rowsImported: number;
  errors: ImportIssue[];
  warnings: string[];
}

function classify(action: string): Transaction["kind"] | null {
  const a = action.toLowerCase();
  if (/dividend/.test(a)) return "dividend";
  if (/\bbuy\b/.test(a)) return "buy";
  if (/\bsell\b/.test(a)) return "sell";
  if (/deposit/.test(a)) return "deposit";
  if (/withdraw/.test(a)) return "withdrawal";
  if (/interest/.test(a)) return "interest";
  if (/conversion|fx/.test(a)) return "fx";
  if (/fee|stamp|tax/.test(a)) return "fee";
  return null;
}

const num = (s: string | undefined): number | null => {
  if (s == null) return null;
  const t = s.replace(/,/g, "").trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

function toIso(s: string): string | null {
  const t = s.trim();
  if (!t) return null;
  // "2024-01-15 10:30:00" or ISO; treated as UTC (the export doesn't state a zone).
  const iso = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(t) ? t.replace(" ", "T") + "Z" : t;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

interface Pool { key: string; name: string; ticker: string | null; isin: string | null; qty: number; cost: number; priceCurrency: string | null; pxQty: number; pxSum: number; incomplete: boolean }

export function importTrading212Csv(text: string, maxRows = 20000): ImportResult {
  const empty: ImportResult = {
    ok: false, baseCurrency: "GBP", holdings: [], transactions: [], realisedByInstrument: {}, realisedTotal: 0,
    dividendsTotal: 0, withholdingTotal: 0, depositsTotal: 0, withdrawalsTotal: 0, feesTotal: 0, interestTotal: 0,
    rowsTotal: 0, rowsImported: 0, errors: [], warnings: [],
  };
  const rows = parseCsv(text);
  if (rows.length < 2) return { ...empty, errors: [{ row: 0, message: "The file is empty or has no data rows." }] };
  if (rows.length - 1 > maxRows) return { ...empty, errors: [{ row: 0, message: `The file has more than ${maxRows} rows. Export a shorter date range.` }] };

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const idx = {} as Record<Col, number>;
  for (const [k, re] of Object.entries(COLUMNS) as [Col, RegExp][]) idx[k] = header.findIndex((h) => re.test(h));
  const missing = REQUIRED.filter((k) => idx[k] < 0);
  if (missing.length) {
    return { ...empty, errors: [{ row: 1, message: `This doesn't look like a Trading 212 export. Missing column(s): ${missing.join(", ")}.` }] };
  }
  const get = (r: string[], k: Col) => (idx[k] >= 0 ? r[idx[k]]?.trim() ?? "" : "");

  const res: ImportResult = { ...empty, rowsTotal: rows.length - 1, errors: [], warnings: [] };
  const seen = new Set<string>();
  const parsed: { row: number; tx: Transaction; withholding: number | null }[] = [];
  const currencies = new Set<string>();

  rows.slice(1).forEach((r, i) => {
    const rowNo = i + 2;
    const dedupeKey = get(r, "id") || r.join("\u0001");
    if (seen.has(dedupeKey)) { res.warnings.push(`Row ${rowNo} is a duplicate and was skipped.`); return; }
    seen.add(dedupeKey);
    const action = get(r, "action");
    const kind = classify(action);
    if (!kind) { res.errors.push({ row: rowNo, message: `Unrecognised action "${action}".` }); return; }
    const occurredAt = toIso(get(r, "time"));
    if (!occurredAt) { res.errors.push({ row: rowNo, message: "Missing or unreadable date." }); return; }
    const total = num(get(r, "total"));
    if (total == null) { res.errors.push({ row: rowNo, message: "Missing Total amount." }); return; }
    const shares = num(get(r, "shares"));
    const ticker = get(r, "ticker") || null;
    const rawIsin = get(r, "isin").toUpperCase();
    const isin = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(rawIsin) ? rawIsin : null;
    if (rawIsin && !isin) res.warnings.push(`Row ${rowNo}: "${rawIsin}" isn't a valid ISIN, so the ticker is used instead.`);
    if ((kind === "buy" || kind === "sell") && (!(shares && shares > 0) || (!ticker && !isin))) {
      res.errors.push({ row: rowNo, message: "A buy or sell needs a share count and a ticker or ISIN." }); return;
    }
    const totalCurrency = get(r, "totalCurrency");
    if (totalCurrency) currencies.add(totalCurrency.toUpperCase());
    parsed.push({
      row: rowNo,
      withholding: num(get(r, "withholding")),
      tx: {
        id: `t212-${get(r, "id") || rowNo}`,
        kind, occurredAt, ticker, isin, name: get(r, "name") || null,
        quantity: shares, price: num(get(r, "price")), priceCurrency: get(r, "priceCurrency").toUpperCase() || null,
        totalBase: Math.abs(total), baseCurrency: totalCurrency.toUpperCase() || null,
        withholdingTax: num(get(r, "withholding")),
        // Rows without an ID (some dividends) get a reference built from their contents, so re-imports de-duplicate.
        externalRef: get(r, "id") || `${kind}|${occurredAt}|${isin ?? ticker ?? ""}|${total}`,
        source: "csv_trading212",
      },
    });
  });

  if (currencies.size > 1) res.warnings.push(`Totals use more than one currency (${[...currencies].join(", ")}). Figures are added as if they were the same currency; check them.`);
  if (!currencies.size) res.warnings.push("No 'Currency (Total)' column found, so amounts are assumed to be in pounds.");
  res.baseCurrency = [...currencies][0] ?? "GBP";

  const pools = new Map<string, Pool>();
  parsed.sort((a, b) => a.tx.occurredAt.localeCompare(b.tx.occurredAt));
  for (const { row, tx, withholding } of parsed) {
    const amount = tx.totalBase!;
    if (tx.kind === "buy" || tx.kind === "sell") {
      const key = tx.isin ?? tx.ticker!;
      const p = pools.get(key) ?? { key, name: tx.name ?? key, ticker: tx.ticker, isin: tx.isin, qty: 0, cost: 0, priceCurrency: tx.priceCurrency, pxQty: 0, pxSum: 0, incomplete: false };
      pools.set(key, p);
      const q = tx.quantity!;
      if (tx.kind === "buy") {
        p.qty += q; p.cost += amount;
        if (tx.price != null && tx.priceCurrency === p.priceCurrency) { p.pxQty += q; p.pxSum += q * tx.price; }
      } else {
        if (q > p.qty + 1e-9) {
          res.warnings.push(`Row ${row}: sold more ${p.name} than the file shows being bought. Earlier history may be missing, so its cost is marked unknown.`);
          p.incomplete = true;
        }
        const removed = p.qty > 0 ? p.cost * Math.min(1, q / p.qty) : 0;
        const realised = amount - removed;
        if (!p.incomplete) {
          res.realisedByInstrument[p.name] = (res.realisedByInstrument[p.name] ?? 0) + realised;
          res.realisedTotal += realised;
        }
        const frac = p.qty > 0 ? Math.min(1, q / p.qty) : 1;
        p.pxQty *= 1 - frac; p.pxSum *= 1 - frac;
        p.cost -= removed; p.qty = Math.max(0, p.qty - q);
      }
    } else if (tx.kind === "dividend") {
      res.dividendsTotal += amount;
      if (withholding) res.withholdingTotal += Math.abs(withholding);
    } else if (tx.kind === "deposit") res.depositsTotal += amount;
    else if (tx.kind === "withdrawal") res.withdrawalsTotal += amount;
    else if (tx.kind === "fee") res.feesTotal += amount;
    else if (tx.kind === "interest") res.interestTotal += amount;
    res.transactions.push(tx);
  }

  res.holdings = [...pools.values()].filter((p) => p.qty > 1e-9).map((p): Holding => ({
    id: `t212-${p.key}`,
    name: p.name, ticker: p.ticker, isin: p.isin,
    assetType: null, sector: null, region: null,
    quantity: round(p.qty, 10),
    instrumentCurrency: p.priceCurrency ?? res.baseCurrency,
    avgPrice: p.pxQty > 0 && !p.incomplete ? round(p.pxSum / p.pxQty, 8) : null,
    costBasisBase: p.incomplete ? null : round(p.cost, 4),
    lastPrice: null, lastPriceAt: null, lastPriceSource: null, fxRateToBase: null,
    source: "csv_trading212",
  }));
  res.rowsImported = res.transactions.length;
  res.ok = res.rowsImported > 0;
  for (const k of ["realisedTotal", "dividendsTotal", "withholdingTotal", "depositsTotal", "withdrawalsTotal", "feesTotal", "interestTotal"] as const) res[k] = round(res[k], 4);
  return res;
}

const round = (n: number, dp: number) => Math.round(n * 10 ** dp) / 10 ** dp;
