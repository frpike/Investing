"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { newId } from "@/lib/format";
import type { AssetType, Holding } from "@/lib/portfolio/types";

const ASSET_TYPES: { value: AssetType; label: string }[] = [
  { value: "etf", label: "ETF" }, { value: "share", label: "Individual share" }, { value: "fund", label: "Fund" },
  { value: "bond", label: "Bond" }, { value: "cash", label: "Cash" }, { value: "other", label: "Other" },
];
const CURRENCIES = ["GBP", "GBX", "USD", "EUR"];

/** Add or edit a holding. Blank money fields are saved as "unknown", never as zero. */
export function HoldingForm({ initial, onSave, onCancel }: { initial?: Holding; onSave: (h: Holding) => void; onCancel?: () => void }) {
  const id = useId();
  const [f, setF] = useState(() => ({
    name: initial?.name ?? "", ticker: initial?.ticker ?? "", assetType: initial?.assetType ?? "", sector: initial?.sector ?? "", region: initial?.region ?? "",
    quantity: initial?.quantity?.toString() ?? "", currency: initial?.instrumentCurrency ?? "GBP",
    cost: initial?.costBasisBase?.toString() ?? "", price: initial?.lastPrice?.toString() ?? "",
    priceDate: initial?.lastPriceAt?.slice(0, 10) ?? new Date().toISOString().slice(0, 10), fx: initial?.fxRateToBase?.toString() ?? "",
  }));
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((s) => ({ ...s, [k]: e.target.value }));
  const optNum = (s: string) => (s.trim() === "" ? null : Number(s));
  const foreign = f.currency !== "GBP" && f.currency !== "GBX";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const quantity = Number(f.quantity);
    const cost = optNum(f.cost), price = optNum(f.price), fx = optNum(f.fx);
    if (!f.name.trim()) return setError("Give the holding a name.");
    if (!(quantity >= 0) || f.quantity.trim() === "") return setError("Quantity must be zero or more.");
    if ([cost, price, fx].some((n) => n != null && !(n >= 0 && Number.isFinite(n)))) return setError("Amounts must be positive numbers, or left blank if unknown.");
    if (fx === 0) return setError("An exchange rate can't be zero.");
    onSave({
      id: initial?.id ?? newId(),
      name: f.name.trim(), ticker: f.ticker.trim() || null, isin: initial?.isin ?? null,
      assetType: (f.assetType || null) as AssetType | null, sector: f.sector.trim() || null, region: f.region.trim() || null,
      quantity, instrumentCurrency: f.currency, avgPrice: initial?.avgPrice ?? null, costBasisBase: cost,
      lastPrice: price, lastPriceAt: price != null ? new Date(f.priceDate || Date.now()).toISOString() : null,
      lastPriceSource: price != null ? "user_price" : null, fxRateToBase: foreign ? fx : null,
      source: initial?.source ?? "manual",
    });
  }

  const field = (key: keyof typeof f, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}, hint?: string) => (
    <div className="grid gap-1.5">
      <Label htmlFor={`${id}-${key}`}>{label}</Label>
      <Input id={`${id}-${key}`} value={f[key]} onChange={set(key)} {...props} />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        {field("name", "Name", { required: true, maxLength: 160, placeholder: "e.g. Vanguard FTSE All-World" })}
        {field("ticker", "Ticker (optional)", { maxLength: 32, placeholder: "e.g. VWRP" })}
        {field("quantity", "Number of shares or units", { type: "number", min: 0, step: "any", inputMode: "decimal", required: true })}
        <div className="grid gap-1.5">
          <Label htmlFor={`${id}-currency`}>Price currency</Label>
          <select id={`${id}-currency`} value={f.currency} onChange={set("currency")} className="h-9 rounded-md border bg-transparent px-3 text-sm">
            {CURRENCIES.map((c) => <option key={c} value={c}>{c === "GBX" ? "GBX (pence)" : c}</option>)}
          </select>
        </div>
        {field("price", "Latest price per share (optional)", { type: "number", min: 0, step: "any", inputMode: "decimal" }, `In ${f.currency === "GBX" ? "pence" : f.currency}. Leave blank if you don't know; the value will show as unknown.`)}
        {field("priceDate", "Price as of", { type: "date" })}
        {foreign && field("fx", `Pounds per 1 ${f.currency} (optional)`, { type: "number", min: 0, step: "any", inputMode: "decimal" }, "Needed to show the value in pounds. Leave blank if unsure.")}
        {field("cost", "Total cost in £ (optional)", { type: "number", min: 0, step: "any", inputMode: "decimal" }, "What you paid in total, in pounds. Used for gains and losses.")}
        <div className="grid gap-1.5">
          <Label htmlFor={`${id}-assetType`}>Type (optional)</Label>
          <select id={`${id}-assetType`} value={f.assetType} onChange={set("assetType")} className="h-9 rounded-md border bg-transparent px-3 text-sm">
            <option value="">Not specified</option>
            {ASSET_TYPES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
        </div>
        {field("sector", "Sector label (optional)", { maxLength: 60, placeholder: "e.g. Technology, Global" }, "Your own label, used for exposure and the sandbox.")}
        {field("region", "Region label (optional)", { maxLength: 60, placeholder: "e.g. US, Global" })}
      </div>
      {error && <p className="text-sm text-loss" role="alert">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit">{initial ? "Save changes" : "Add holding"}</Button>
        {onCancel && <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>}
      </div>
    </form>
  );
}
