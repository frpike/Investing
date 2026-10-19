"use client";

import { ChevronDown, FlaskConical, MessageCircle, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useApp } from "@/components/app-state";
import { EducationNote, HypotheticalBanner } from "@/components/notes";
import { CsvImport } from "@/components/portfolio/csv-import";
import { HoldingForm } from "@/components/portfolio/holding-form";
import { Trading212Sync } from "@/components/portfolio/trading212-sync";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { date, gbp, money, newId, pct, signedGbp } from "@/lib/format";
import { summarizeLedger } from "@/lib/portfolio/ledger";
import { holdingCost, holdingValue, METHODS, summarize, type Slice } from "@/lib/portfolio/metrics";
import type { Holding } from "@/lib/portfolio/types";
import { ensurePortfolio, removeHolding, upsertHolding } from "@/lib/store/actions";
import { cn } from "@/lib/utils";

/** "How it's calculated" plus "Learn what this means" for a single metric. */
function Explain({ method, children }: { method: string; children?: React.ReactNode }) {
  return (
    <details className="group mt-2 text-sm">
      <summary className="flex cursor-pointer list-none items-center gap-1 text-primary">
        <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" aria-hidden />Learn what this means
      </summary>
      <div className="mt-2 space-y-2 rounded-lg bg-muted/70 p-3">
        {children}
        <p className="text-xs text-muted-foreground"><strong>How it&apos;s calculated:</strong> {method}</p>
      </div>
    </details>
  );
}

function Metric({ label, value, tone, children, method }: { label: string; value: string; tone?: "gain" | "loss"; method: string; children?: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardDescription>{label}</CardDescription>
        <CardTitle className={cn("text-2xl tabular", tone === "gain" && "text-gain", tone === "loss" && "text-loss")}>{value}</CardTitle>
      </CardHeader>
      <CardContent><Explain method={method}>{children}</Explain></CardContent>
    </Card>
  );
}

function Bars({ slices, label }: { slices: Slice[]; label: string }) {
  if (!slices.length) return <p className="text-sm text-muted-foreground">No priced holdings yet.</p>;
  return (
    <ul className="space-y-2" aria-label={label}>
      {slices.map((s) => (
        <li key={s.label} className="grid grid-cols-[minmax(6rem,10rem)_1fr_3.5rem] items-center gap-3 text-sm">
          <span className="truncate" title={s.label}>{s.label}</span>
          <span className="h-2.5 rounded-full bg-muted"><span className="block h-full rounded-full bg-primary" style={{ width: `${Math.max(2, s.weight * 100)}%` }} /></span>
          <span className="text-right tabular">{pct(s.weight, 0)}</span>
        </li>
      ))}
    </ul>
  );
}

export function PortfolioView() {
  const { data, ready, apply, mode } = useApp();
  const [editing, setEditing] = useState<Holding | "new" | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  if (!ready) return <p className="text-muted-foreground">Loading…</p>;

  const portfolio = data.portfolio;
  const holdings = portfolio?.holdings ?? [];
  const s = summarize({ baseCurrency: portfolio?.baseCurrency ?? "GBP", holdings });
  const ledger = summarizeLedger(portfolio?.transactions ?? []);
  const save = (h: Holding) => {
    const pid = ensurePortfolio(data, newId(), new Date()).id;
    void apply((d) => upsertHolding(d, h, pid, new Date()));
    setEditing(null);
  };
  const largest = s.largest;
  const usd = s.byCurrency.find((c) => c.label !== "GBP");

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold">Your portfolio</h1>
          <p className="text-sm text-muted-foreground">
            {holdings.length ? <>Prices come from your last Trading 212 sync or were entered by you; they aren&apos;t live. Oldest price: {date(s.oldestPriceAt)}.</> : "Sync Trading 212, import a CSV export, or add holdings by hand."}
            {mode === "guest" && " Saved in this browser only."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline"><Link href="/portfolio/sandbox"><FlaskConical />What-if sandbox</Link></Button>
          <Button onClick={() => setEditing("new")}>Add holding</Button>
        </div>
      </div>

      <Trading212Sync />

      {holdings.length === 0 ? (
        <Card><CardContent className="space-y-4 pt-6">
          <p>Nothing here yet. Two ways to start:</p>
          <Tabs defaultValue="import">
            <TabsList><TabsTrigger value="import">Import from Trading 212</TabsTrigger><TabsTrigger value="manual">Add by hand</TabsTrigger></TabsList>
            <TabsContent value="import" className="pt-4"><CsvImport /></TabsContent>
            <TabsContent value="manual" className="pt-4"><HoldingForm onSave={save} /></TabsContent>
          </Tabs>
        </CardContent></Card>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" aria-label="Summary">
            <Metric label="Total value" value={s.totalValue != null ? gbp(s.totalValue) : "Unknown"} method={METHODS.totalValue}>
              <p>What your holdings would be worth at the latest prices you have. It changes every time prices move, and you only get it if you sell at those prices.</p>
              {s.unpriced.length > 0 && <p><strong>Why unknown:</strong> {s.unpriced.map((u) => u.name).join(", ")} {s.unpriced.length === 1 ? "has" : "have"} no {s.unpriced.some((u) => u.reason === "no_fx") ? "price or exchange rate" : "price"}. Priced holdings come to {gbp(s.pricedValue)}. We don&apos;t guess the rest.</p>}
            </Metric>
            <Metric label="Total invested" value={gbp(s.invested)} method={METHODS.invested}>
              <p>Your <strong>cost basis</strong>: what you paid for what you still hold. It&apos;s the starting point for working out gains and losses.</p>
              {s.invested == null && <p>Unknown because at least one holding has no cost recorded.</p>}
            </Metric>
            <Metric label="Unrealised gain / loss" value={s.unrealised ? signedGbp(s.unrealised.amount) : "Unknown"} tone={s.unrealised ? (s.unrealised.amount >= 0 ? "gain" : "loss") : undefined} method={METHODS.unrealised}>
              <p><strong>Unrealised</strong> means on paper: you haven&apos;t sold, so it can still change in either direction. It becomes <strong>realised</strong> when you sell.</p>
              {s.unrealised && s.unrealised.holdingsCounted < s.unrealised.holdingsTotal && <p>Covers {s.unrealised.holdingsCounted} of {s.unrealised.holdingsTotal} holdings; the rest are missing a price or cost.</p>}
              {s.unrealised?.pct != null && <p>As a percentage of cost: {pct(s.unrealised.pct)}.</p>}
            </Metric>
            <Metric label="Realised gains and dividends" value={ledger.realised == null ? "Unknown" : signedGbp(ledger.realised + ledger.dividends)} method="Realised: for each sale, sale proceeds minus the average cost of the shares sold. Dividends: cash paid out to you. Both from imported transactions.">
              <p>Money you&apos;ve actually locked in by selling ({ledger.realised == null ? "unknown: some sales couldn't be matched to buys" : signedGbp(ledger.realised)}) plus dividends received ({gbp(ledger.dividends)}).</p>
              <p>In a general investment account these can count towards tax allowances; inside an ISA they&apos;re tax-free.</p>
            </Metric>
          </section>

          <section className="grid items-start gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-lg">Allocation by holding</CardTitle>
                {s.effectiveHoldings && <CardDescription>Behaves like about {s.effectiveHoldings.toFixed(1)} equal-sized holdings</CardDescription>}
              </CardHeader>
              <CardContent>
                <Bars slices={s.allocation} label="Allocation by holding" />
                <Explain method={METHODS.concentration}>
                  {largest && (
                    <>
                      <p><strong>Concentration risk</strong> is how much one holding can move your whole portfolio. {largest.label} is {pct(largest.weight, 0)} of your priced holdings.</p>
                      <HypotheticalBanner>If {largest.label} fell 10%, your portfolio would fall about {pct(largest.weight * 0.1)}; if it fell 50%, about {pct(largest.weight * 0.5)}. Everything else is assumed unchanged.</HypotheticalBanner>
                    </>
                  )}
                  <p>A fund that holds hundreds of companies is already spread out inside, so one large fund isn&apos;t the same risk as one large single share.</p>
                </Explain>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-lg">Exposure</CardTitle><CardDescription>By price currency, type and your sector labels</CardDescription></CardHeader>
              <CardContent className="space-y-5">
                <div><p className="mb-2 text-sm font-medium">Currency</p><Bars slices={s.byCurrency} label="Currency exposure" /></div>
                <div><p className="mb-2 text-sm font-medium">Type</p><Bars slices={s.byAssetType} label="Asset type" /></div>
                <div><p className="mb-2 text-sm font-medium">Sector label</p><Bars slices={s.bySector} label="Sector" /></div>
                <Explain method={`${METHODS.currency} ${METHODS.sector}`}>
                  <p><strong>Currency risk:</strong> a holding priced in dollars changes value in pounds when the exchange rate moves, even if its dollar price stays the same.</p>
                  {usd && <HypotheticalBanner>If the pound strengthened 10% against the {usd.label === "USD" ? "dollar" : usd.label}, holdings priced in {usd.label} would be worth about 9.1% less in pounds (1 ÷ 1.10 = 0.909).</HypotheticalBanner>}
                </Explain>
              </CardContent>
            </Card>
          </section>

          <section aria-labelledby="holdings-h" className="space-y-3">
            <h2 id="holdings-h" className="text-xl font-semibold">Holdings</h2>
            <div className="overflow-x-auto rounded-xl border bg-card">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr><th className="px-4 py-3 font-medium">Holding</th><th className="px-4 py-3 text-right font-medium">Quantity</th><th className="px-4 py-3 text-right font-medium">Price</th><th className="px-4 py-3 text-right font-medium">Value</th><th className="px-4 py-3 text-right font-medium">Gain / loss</th><th className="px-4 py-3"><span className="sr-only">Actions</span></th></tr>
                </thead>
                <tbody className="divide-y">
                  {holdings.map((h) => {
                    const v = holdingValue(h, s.base), c = holdingCost(h, s.base);
                    const g = v != null && c != null ? v - c : null;
                    const txs = (portfolio?.transactions ?? []).filter((t) => (h.isin && t.isin === h.isin) || (h.ticker && t.ticker === h.ticker));
                    return [
                      <tr key={h.id} className="align-top">
                        <td className="px-4 py-3">
                          <button className="text-left font-medium hover:underline" onClick={() => setOpen(open === h.id ? null : h.id)} aria-expanded={open === h.id}>{h.name}</button>
                          <div className="mt-0.5 flex flex-wrap gap-1 text-xs text-muted-foreground">{h.ticker && <span>{h.ticker}</span>}<Badge variant="outline" className="h-4 px-1 text-[10px]">{h.source === "api_trading212" ? "Synced" : h.source === "csv_trading212" ? "Imported" : "Manual"}</Badge></div>
                        </td>
                        <td className="px-4 py-3 text-right tabular">{h.quantity}</td>
                        <td className="px-4 py-3 text-right tabular">{h.lastPrice != null ? <>{money(h.lastPrice, h.instrumentCurrency)}<div className="text-xs text-muted-foreground">{date(h.lastPriceAt)}</div></> : <span className="text-muted-foreground">Unknown</span>}</td>
                        <td className="px-4 py-3 text-right tabular">{gbp(v)}</td>
                        <td className={cn("px-4 py-3 text-right tabular", g != null && (g >= 0 ? "text-gain" : "text-loss"))}>{signedGbp(g)}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="icon-sm" variant="ghost" aria-label={`Edit ${h.name}`} onClick={() => setEditing(h)}><Pencil /></Button>
                            <Button size="icon-sm" variant="ghost" aria-label={`Remove ${h.name}`} onClick={() => void apply((d) => removeHolding(d, h.id, new Date()))}><Trash2 /></Button>
                          </div>
                        </td>
                      </tr>,
                      open === h.id && (
                        <tr key={`${h.id}-detail`} className="bg-muted/40">
                          <td colSpan={6} className="space-y-3 px-4 py-4">
                            <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-3">
                              <div><dt className="text-xs text-muted-foreground">Cost</dt><dd className="tabular">{gbp(c)}</dd></div>
                              <div><dt className="text-xs text-muted-foreground">Average price paid</dt><dd className="tabular">{h.avgPrice != null ? money(h.avgPrice, h.instrumentCurrency) : "Unknown"}</dd></div>
                              <div><dt className="text-xs text-muted-foreground">Share of priced holdings</dt><dd className="tabular">{pct(s.allocation.find((a) => a.id === h.id)?.weight ?? null)}</dd></div>
                              <div><dt className="text-xs text-muted-foreground">Price currency</dt><dd>{h.instrumentCurrency === "GBX" ? "GBX (pence)" : h.instrumentCurrency}</dd></div>
                              <div><dt className="text-xs text-muted-foreground">Data source</dt><dd>{h.source === "api_trading212" ? "Trading 212 sync (read-only)" : h.source === "csv_trading212" ? "Trading 212 CSV import" : "Entered by you"}{h.lastPriceSource === "user_price" ? "; price entered by you" : h.lastPriceSource === "api_trading212" ? "; price from Trading 212 at sync time" : ""}</dd></div>
                              <div><dt className="text-xs text-muted-foreground">Transactions on file</dt><dd className="tabular">{txs.length}</dd></div>
                            </dl>
                            {g != null && c != null && c > 0 && (
                              <p className="text-sm">Worked out as value {gbp(v)} − cost {gbp(c)} = <strong>{signedGbp(g)}</strong> ({pct(g / c)} of what you paid). A 5% price fall from here would change the value by about {signedGbp(-(v ?? 0) * 0.05)}.</p>
                            )}
                            <Button asChild size="sm" variant="outline">
                              <Link href={`/tutor?q=${encodeURIComponent(`Help me understand my holding in ${h.name}${h.ticker ? ` (${h.ticker})` : ""}: what it is, what drives its price, and what risks it adds to my portfolio.`)}`}><MessageCircle />Ask the tutor about {h.ticker ?? "this"}</Link>
                            </Button>
                          </td>
                        </tr>
                      ),
                    ];
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {ledger.dividendHistory.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-xl font-semibold">Dividends received</h2>
              <ul className="divide-y rounded-xl border bg-card text-sm">
                {ledger.dividendHistory.slice(0, 12).map((d, i) => (
                  <li key={i} className="flex justify-between px-4 py-2"><span>{d.name} · {date(d.occurredAt)}</span><span className="tabular">{gbp(d.amount)}</span></li>
                ))}
              </ul>
            </section>
          )}

          <details className="rounded-xl border bg-card p-4">
            <summary className="cursor-pointer font-medium">Import or re-import from Trading 212</summary>
            <div className="pt-4"><CsvImport /></div>
          </details>
        </>
      )}

      {data.imports.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Import history</h2>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {data.imports.slice().reverse().map((i) => <li key={i.id}>{date(i.at)} · {i.fileName} · {i.rowsImported} rows imported, {i.rowsRejected} rejected</li>)}
          </ul>
        </section>
      )}

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>{editing === "new" ? "Add a holding" : "Edit holding"}</DialogTitle></DialogHeader>
          {editing !== null && <HoldingForm initial={editing === "new" ? undefined : editing} onSave={save} onCancel={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>
      <EducationNote />
    </div>
  );
}
