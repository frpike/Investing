"use client";

import { Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useApp } from "@/components/app-state";
import { HypotheticalBanner } from "@/components/notes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { gbp, pct, signedGbp } from "@/lib/format";
import { holdingValue } from "@/lib/portfolio/metrics";
import { applyScenarios, type Scenario } from "@/lib/portfolio/scenarios";
import type { Holding } from "@/lib/portfolio/types";
import { cn } from "@/lib/utils";

// A clearly fictional portfolio for learners who haven't added their own yet.
const SAMPLE: Holding[] = [
  { id: "s1", name: "Example Global Index Fund (fictional)", ticker: null, isin: null, assetType: "etf", sector: "Global", region: "Global", quantity: 10, instrumentCurrency: "GBP", avgPrice: null, costBasisBase: 900, lastPrice: 100, lastPriceAt: null, lastPriceSource: null, fxRateToBase: null, source: "manual" },
  { id: "s2", name: "Example US Tech Co (fictional)", ticker: null, isin: null, assetType: "share", sector: "Technology", region: "US", quantity: 4, instrumentCurrency: "USD", avgPrice: null, costBasisBase: 280, lastPrice: 100, lastPriceAt: null, lastPriceSource: null, fxRateToBase: 0.8, source: "manual" },
  { id: "s3", name: "Example UK Bank (fictional)", ticker: null, isin: null, assetType: "share", sector: "Financials", region: "UK", quantity: 50, instrumentCurrency: "GBX", avgPrice: null, costBasisBase: 210, lastPrice: 400, lastPriceAt: null, lastPriceSource: null, fxRateToBase: null, source: "manual" },
];

const describe = (s: Scenario, holdings: Holding[]) => {
  const name = (id: string) => holdings.find((h) => h.id === id)?.name ?? "a holding";
  switch (s.kind) {
    case "holding": return `${name(s.holdingId)} ${s.pct >= 0 ? "rises" : "falls"} ${Math.abs(s.pct)}%`;
    case "sector": return `Everything labelled "${s.sector}" ${s.pct >= 0 ? "rises" : "falls"} ${Math.abs(s.pct)}%`;
    case "assetType": return `All ${s.assetType} holdings move ${s.pct}%`;
    case "fx": return `The pound ${s.pct >= 0 ? "strengthens" : "weakens"} ${Math.abs(s.pct)}% against ${s.currency}`;
    case "dividend": return `${name(s.holdingId)} pays a dividend of ${s.perShare} per share`;
  }
};

export function Sandbox() {
  const { data, ready } = useApp();
  const own = (data.portfolio?.holdings ?? []).filter((h) => holdingValue(h, "GBP") != null);
  const [useSample, setUseSample] = useState(false);
  const holdings = own.length && !useSample ? own : SAMPLE;
  const usingSample = holdings === SAMPLE;
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [kind, setKind] = useState<Scenario["kind"]>("holding");
  const [target, setTarget] = useState("");
  const [amount, setAmount] = useState("-10");

  const sectors = [...new Set(holdings.map((h) => h.sector).filter(Boolean))] as string[];
  const currencies = [...new Set(holdings.map((h) => (h.instrumentCurrency === "GBX" ? "GBP" : h.instrumentCurrency)).filter((c) => c !== "GBP"))];
  const result = applyScenarios({ baseCurrency: "GBP", holdings }, scenarios);

  function add(s?: Scenario) {
    const n = Number(amount);
    const next: Scenario | null = s ?? (
      kind === "holding" ? { kind, holdingId: target || holdings[0]?.id, pct: n }
      : kind === "sector" ? { kind, sector: target || sectors[0], pct: n }
      : kind === "fx" ? { kind, currency: target || currencies[0], pct: n }
      : kind === "dividend" ? { kind, holdingId: target || holdings[0]?.id, perShare: Math.abs(n) }
      : null);
    if (!next || !Number.isFinite(n) || Math.abs(n) > 100) return;
    setScenarios((xs) => [...xs, next]);
  }

  if (!ready) return <p className="text-muted-foreground">Loading…</p>;
  const options = kind === "holding" || kind === "dividend" ? holdings.map((h) => ({ value: h.id, label: h.name }))
    : kind === "sector" ? sectors.map((x) => ({ value: x, label: x })) : currencies.map((x) => ({ value: x, label: x }));

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold">What-if sandbox</h1>
        <p className="text-muted-foreground">See how a single move would change your portfolio in pounds. Use it to understand risk, not to forecast.</p>
      </div>
      <HypotheticalBanner>Every result here is a made-up scenario applied to today&apos;s values. Real markets move many things at once, and nothing here predicts what will happen.</HypotheticalBanner>
      {usingSample && (
        <p className="text-sm text-muted-foreground">
          {own.length ? "Using the fictional example portfolio. " : "You haven't added priced holdings yet, so this uses a fictional example portfolio. "}
          {own.length ? <button className="text-primary underline" onClick={() => setUseSample(false)}>Use mine</button> : <Link className="text-primary underline" href="/portfolio">Add your own</Link>}
        </p>
      )}
      {!usingSample && <button className="text-sm text-primary underline" onClick={() => { setUseSample(true); setScenarios([]); }}>Try the fictional example instead</button>}

      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <Card>
          <CardHeader><CardTitle className="text-lg">Build a scenario</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {holdings[0] && <Button size="sm" variant="outline" onClick={() => add({ kind: "holding", holdingId: holdings[0].id, pct: -10 })}>One holding falls 10%</Button>}
              {sectors[0] && <Button size="sm" variant="outline" onClick={() => add({ kind: "sector", sector: sectors[0], pct: -15 })}>A sector falls 15%</Button>}
              {currencies[0] && <Button size="sm" variant="outline" onClick={() => add({ kind: "fx", currency: currencies[0], pct: 10 })}>Pound strengthens 10%</Button>}
              {holdings.length > 1 && <Button size="sm" variant="outline" onClick={() => setScenarios([{ kind: "holding", holdingId: holdings[0].id, pct: 5 }, { kind: "holding", holdingId: holdings[1].id, pct: -5 }])}>One up 5%, another down 5%</Button>}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="grid gap-1.5"><Label htmlFor="sb-kind">Type</Label>
                <select id="sb-kind" value={kind} onChange={(e) => { setKind(e.target.value as Scenario["kind"]); setTarget(""); }} className="h-9 rounded-md border bg-transparent px-2 text-sm">
                  <option value="holding">Holding moves</option>
                  <option value="sector" disabled={!sectors.length}>Sector moves</option>
                  <option value="fx" disabled={!currencies.length}>Exchange rate</option>
                  <option value="dividend">Dividend paid</option>
                </select>
              </div>
              <div className="grid gap-1.5"><Label htmlFor="sb-target">Applies to</Label>
                <select id="sb-target" value={target} onChange={(e) => setTarget(e.target.value)} className="h-9 rounded-md border bg-transparent px-2 text-sm">
                  {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="grid gap-1.5"><Label htmlFor="sb-amount">{kind === "dividend" ? "Per share" : kind === "fx" ? "Pound change %" : "Change %"}</Label>
                <Input id="sb-amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} step="any" />
              </div>
            </div>
            <Button onClick={() => add()}>Add to scenario</Button>
            {scenarios.length > 0 && (
              <ul className="space-y-1 text-sm">
                {scenarios.map((s, i) => (
                  <li key={i} className="flex items-center justify-between rounded-md bg-muted px-3 py-1.5">
                    {describe(s, holdings)}
                    <Button size="icon-xs" variant="ghost" aria-label="Remove" onClick={() => setScenarios((xs) => xs.filter((_, j) => j !== i))}><Trash2 /></Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Result (hypothetical)</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-muted p-3"><p className="text-xs text-muted-foreground">Before</p><p className="font-semibold tabular">{gbp(result.before)}</p></div>
              <div className="rounded-lg bg-muted p-3"><p className="text-xs text-muted-foreground">After</p><p className="font-semibold tabular">{gbp(result.after)}</p></div>
              <div className="rounded-lg bg-muted p-3"><p className="text-xs text-muted-foreground">Change</p><p className={cn("font-semibold tabular", result.change > 0 && "text-gain", result.change < 0 && "text-loss")}>{signedGbp(result.change)} <span className="block text-xs">{pct(result.changePct)}</span></p></div>
            </div>
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground"><tr><th className="py-1 font-medium">Holding</th><th className="py-1 text-right font-medium">Before</th><th className="py-1 text-right font-medium">After</th></tr></thead>
              <tbody className="divide-y">{result.perHolding.map((h) => (
                <tr key={h.id}><td className="py-1.5 pr-2">{h.name}</td><td className="py-1.5 text-right tabular">{gbp(h.before)}</td><td className="py-1.5 text-right tabular">{gbp(h.after)}</td></tr>
              ))}</tbody>
            </table>
            {result.cashAdded > 0 && <p className="text-sm">Dividend cash added: {gbp(result.cashAdded)}. Note the share price usually drops by roughly the dividend amount when it&apos;s paid, which this simple model doesn&apos;t show.</p>}
            {result.excluded.length > 0 && <p className="text-xs text-muted-foreground">Left out because they have no price: {result.excluded.join(", ")}.</p>}
            {scenarios.length > 0 && (
              <p className="text-sm text-muted-foreground">
                What to notice: a move in one holding changes the whole portfolio by roughly that move × the holding&apos;s share of the portfolio. Spreading money across many holdings makes each single move matter less, but a market-wide fall still hits everything.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
