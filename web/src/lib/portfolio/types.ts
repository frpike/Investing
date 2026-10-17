export type AssetType = "share" | "etf" | "fund" | "bond" | "cash" | "other";
export type SourceId = "manual" | "csv_trading212" | "api_trading212" | "user_price";

/**
 * A position. Every money field is nullable: null means "we don't know", which is shown as
 * unknown and excluded from totals with a visible note. It is never treated as zero.
 */
export interface Holding {
  id: string;
  name: string;
  ticker: string | null;
  isin: string | null;
  assetType: AssetType | null;
  sector: string | null;
  region: string | null;
  quantity: number;
  /** ISO currency of the quoted price. "GBX" (pence) is handled as 1/100 GBP. */
  instrumentCurrency: string;
  avgPrice: number | null;
  /** What the position cost, in the portfolio's base currency. */
  costBasisBase: number | null;
  lastPrice: number | null;
  lastPriceAt: string | null;
  lastPriceSource: SourceId | null;
  /** Units of base currency per 1 unit of instrument currency. Not needed when currencies match. */
  fxRateToBase: number | null;
  source: SourceId;
}

export interface Transaction {
  id: string;
  kind: "buy" | "sell" | "dividend" | "deposit" | "withdrawal" | "fee" | "interest" | "fx" | "other";
  occurredAt: string;
  ticker: string | null;
  isin: string | null;
  name: string | null;
  quantity: number | null;
  price: number | null;
  priceCurrency: string | null;
  totalBase: number | null;
  baseCurrency: string | null;
  withholdingTax: number | null;
  externalRef: string | null;
  source: SourceId;
}

export interface Portfolio {
  id: string;
  name: string;
  kind: "manual" | "live" | "practice";
  baseCurrency: string;
  holdings: Holding[];
  transactions: Transaction[];
  updatedAt: string;
}
