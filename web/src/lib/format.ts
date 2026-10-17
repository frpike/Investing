const gbpFmt = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });

/** £1,234.56; "Unknown" for null so missing values never read as zero. */
export const gbp = (n: number | null | undefined) => (n == null ? "Unknown" : gbpFmt.format(n));
export const money = (n: number | null | undefined, currency: string) =>
  n == null ? "Unknown" : new Intl.NumberFormat("en-GB", { style: "currency", currency: currency === "GBX" ? "GBP" : currency }).format(currency === "GBX" ? n / 100 : n);
export const pct = (n: number | null | undefined, dp = 1) => (n == null ? "Unknown" : `${(n * 100).toFixed(dp)}%`);
export const signedGbp = (n: number | null | undefined) => (n == null ? "Unknown" : `${n >= 0 ? "+" : "−"}${gbpFmt.format(Math.abs(n))}`);
export const date = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Unknown";
export const newId = () => crypto.randomUUID();
