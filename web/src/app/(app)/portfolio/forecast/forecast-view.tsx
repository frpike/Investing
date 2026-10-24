"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { Area, CartesianGrid, ComposedChart, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useApp } from "@/components/app-state";
import { EducationNote, HypotheticalBanner, InfoNote } from "@/components/notes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { date, gbp, pct, signedGbp } from "@/lib/format";
import { applyTrial, DEFAULT_ASSUMPTIONS, DEFAULT_CORRELATION, project, riskProfile, type Assumption, type RiskClass, type TrialTrade } from "@/lib/portfolio/forecast";
import { holdingValue, summarize } from "@/lib/portfolio/metrics";
import type { AssetType, Holding } from "@/lib/portfolio/types";
import { cn } from "@/lib/utils";

const axis = { stroke: "var(--muted-foreground)", fontSize: 12 };
const tooltipStyle = { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--popover-foreground)" };
const short = (v: number) => (Math.abs(v) >= 1e6 ? `£${(v / 1e6).toFixed(1)}m` : Math.abs(v) >= 1e3 ? `£${(v / 1e3).toFixed(v >= 1e4 ? 0 : 1)}k` : `£${Math.round(v)}`);

function NumField({ label, value, onChange, min, max, step, suffix }: { label: string; value: number; onChange: (n: number) => void; min: number; max: number; step: number | "any"; suffix?: string }) {
  const id = useId();
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">{label}{suffix ? ` (${suffix})` : ""}</Label>
      <Input id={id} type="number" inputMode="decimal" value={Number.isFinite(value) ? value : ""} min={min} max={max} step={step}
        onChange={(e) => { const n = Number(e.target.value); onChange(Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min); }} />
    </div>
  );
}

function monthlyFromPrefs(amount: number | null | undefined, freq: string | undefined) {
  if (!amount) return 0;
  return freq === "daily" ? Math.round(amount * 30.4) : freq === "weekly" ? Math.round(amount * 4.35) : freq === "monthly" ? amount : 0;
}

export function ForecastView() {
  const { data, ready } = useApp();
  const [years, setYears] = useState(10);
  const [monthly, setMonthly] = useState<number | null>(null);
  const [assumptions, setAssumptions] = useState<Record<RiskClass, Assumption>>(DEFAULT_ASSUMPTIONS);
  const [correlation, setCorrelation] = useState(DEFAULT_CORRELATION);
  const [trade, setTrade] = useState<TrialTrade | null>(null);

  const holdings = useMemo(() => data.portfolio?.holdings ?? [], [data.portfolio]);
  const base = data.portfolio?.baseCurrency ?? "GBP";
  const monthlyAdd = monthly ?? monthlyFromPrefs(data.prefs?.regularAmountGbp, data.prefs?.regularFrequency);

  const now = useMemo(() => {
    const r = riskProfile(holdings, base, assumptions, correlation);
    return { risk: r, proj: project({ start: r.value, monthly: monthlyAdd, expectedReturn: r.expectedReturn, volatility: r.volatility, years }) };
  }, [holdings, base, assumptions, correlation, monthlyAdd, years]);

  const trial = useMemo(() => {
    if (!trade) return null;
    const res = applyTrial(holdings, base, trade);
    if (res.error) return { error: res.error } as const;
    const r = riskProfile(res.holdings, base, assumptions, correlation);
    const extra = trade.funding.kind === "new_money" ? trade.amount : 0;
    return { holdings: res.holdings, risk: r, proj: project({ start: r.value, monthly: monthlyAdd, expectedReturn: r.expectedReturn, volatility: r.volatility, years }), extra, error: null } as const;
  }, [trade, holdings, base, assumptions, correlation, monthlyAdd, years]);

  if (!ready) return <p className="text-muted-foreground">Loading…</p>;

  const end = now.proj.points[years];
  const chart = now.proj.points.map((p) => ({ year: p.year, band: [Math.round(p.p10), Math.round(p.p90)] as [number, number], middle: Math.round(p.p50), paidIn: Math.round(p.paidIn) }));
  const guessed = now.risk.weights.filter((w) => w.guessed);

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <Link href="/portfolio" className="text-sm text-muted-foreground hover:text-foreground">← Portfolio</Link>
        <h1 className="text-3xl font-semibold">Tracking, projections and what-ifs</h1>
        <p className="max-w-3xl text-muted-foreground">How your portfolio has moved, the range of ways it could go from here, and how a purchase you&apos;re considering would change that, before you make it.</p>
      </div>

      <Tracking />

      {holdings.length === 0 || now.risk.value === 0 ? (
        <InfoNote title="Nothing to project yet.">Sync Trading 212, import a CSV, or add holdings with prices in <Link className="underline" href="/portfolio">Portfolio</Link>.</InfoNote>
      ) : (
        <>
          <section className="space-y-4" aria-labelledby="proj-h">
            <h2 id="proj-h" className="text-2xl font-semibold">Range of possible outcomes</h2>
            <HypotheticalBanner>This simulates {now.proj.paths.toLocaleString()} possible futures using the assumptions below. It shows a range, not a prediction: real returns can fall outside it, and the assumptions themselves could be wrong.</HypotheticalBanner>
            <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
              <Card>
                <CardContent className="pt-6">
                  <div className="h-72" role="img" aria-label={`After ${years} years: middle outcome ${gbp(end.p50)}, range ${gbp(end.p10)} to ${gbp(end.p90)}, paid in ${gbp(end.paidIn)}`}>
                    <ResponsiveContainer>
                      <ComposedChart data={chart} margin={{ left: 8, right: 8, top: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="year" {...axis} tickFormatter={(y) => (y === 0 ? "Now" : `${y}y`)} />
                        <YAxis {...axis} tickFormatter={short} width={60} />
                        <Tooltip contentStyle={tooltipStyle} labelFormatter={(y) => (y === 0 ? "Now" : `In ${y} years`)}
                          formatter={(v, name) => (Array.isArray(v) ? [`${gbp(v[0])} – ${gbp(v[1])}`, name] : [gbp(Number(v)), name])} />
                        <Legend />
                        <Area dataKey="band" name="Middle 80% of outcomes" stroke="none" fill="var(--chart-1)" fillOpacity={0.18} />
                        <Line dataKey="middle" name="Middle outcome" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
                        <Line dataKey="paidIn" name="Paid in" stroke="var(--chart-2)" strokeWidth={2} strokeDasharray="5 4" dot={false} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardDescription>In {years} years</CardDescription><CardTitle className="text-2xl tabular">{gbp(end.p50)}</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>Middle outcome. 8 in 10 simulated futures ended between <strong className="tabular">{gbp(end.p10)}</strong> and <strong className="tabular">{gbp(end.p90)}</strong>.</p>
                  <p>You&apos;d have paid in <strong className="tabular">{gbp(end.paidIn)}</strong>.</p>
                  <p>Chance of ending below what you paid in: <strong className="tabular">{pct(now.proj.chanceBelowPaidIn, 0)}</strong>.</p>
                  <p>Chance of a temporary fall of 20% or more at some point: <strong className="tabular">{pct(now.proj.chanceOfBigDrop, 0)}</strong>. Over many years, a big fall along the way is normal, not a sign something has gone wrong.</p>
                  <p className="text-xs text-muted-foreground">The middle outcome grows more slowly than the average return suggests, because ups and downs cost you: a 20% fall needs a 25% rise to recover.</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader><CardTitle className="text-lg">Assumptions</CardTitle><CardDescription>Change these to see how sensitive the range is. They&apos;re rough planning figures, before inflation and fees.</CardDescription></CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <NumField label="Years ahead" value={years} onChange={setYears} min={1} max={40} step={1} />
                  <NumField label="Added each month" suffix="£" value={monthlyAdd} onChange={setMonthly} min={0} max={100000} step="any" />
                  <NumField label="How closely holdings move together" suffix="0–1" value={correlation} onChange={setCorrelation} min={0} max={1} step={0.1} />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px] text-sm">
                    <thead className="text-left text-xs text-muted-foreground"><tr><th className="py-1 font-medium">Type</th><th className="py-1 font-medium">Average yearly return %</th><th className="py-1 font-medium">Yearly volatility %</th></tr></thead>
                    <tbody>{(Object.keys(assumptions) as RiskClass[]).map((k) => (
                      <tr key={k}>
                        <td className="py-1.5 pr-3">{assumptions[k].label}</td>
                        <td className="py-1.5 pr-3"><Input aria-label={`${assumptions[k].label} return`} type="number" step={0.5} className="h-8 w-24" value={assumptions[k].returnPct} onChange={(e) => setAssumptions((a) => ({ ...a, [k]: { ...a[k], returnPct: Number(e.target.value) || 0 } }))} /></td>
                        <td className="py-1.5"><Input aria-label={`${assumptions[k].label} volatility`} type="number" step={1} min={0} className="h-8 w-24" value={assumptions[k].volatilityPct} onChange={(e) => setAssumptions((a) => ({ ...a, [k]: { ...a[k], volatilityPct: Math.max(0, Number(e.target.value) || 0) } }))} /></td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
                <p className="text-sm">Your portfolio, on these assumptions: average return about <strong>{pct(now.risk.expectedReturn)}</strong> a year, volatility about <strong>{pct(now.risk.volatility)}</strong>. If everything moved in lockstep it would be {pct(now.risk.undiversifiedVolatility)}; the difference is what spreading out buys you.</p>
                {guessed.length > 0 && <p className="text-xs text-muted-foreground">Guessed from the name (set the type in Portfolio → edit to be exact): {guessed.map((g) => `${g.name} as ${g.cls === "diversified" ? "a diversified fund" : "an individual share"}`).join("; ")}.</p>}
                {now.risk.excluded.length > 0 && <p className="text-xs text-muted-foreground">Left out because they have no known value: {now.risk.excluded.join(", ")}.</p>}
                <Button variant="ghost" size="sm" onClick={() => { setAssumptions(DEFAULT_ASSUMPTIONS); setCorrelation(DEFAULT_CORRELATION); setMonthly(null); }}>Reset assumptions</Button>
              </CardContent>
            </Card>
          </section>

          <TryPurchase holdings={holdings} base={base} years={years} trade={trade} setTrade={setTrade} current={{ risk: now.risk, proj: now.proj }} trial={trial} />
        </>
      )}
      <EducationNote />
    </div>
  );
}

function Tracking() {
  const { data } = useApp();
  const snaps = data.snapshots.filter((s) => s.totalValue != null);
  const deposits = (data.portfolio?.transactions ?? []).filter((t) => t.kind === "deposit" || t.kind === "withdrawal")
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  const paidInAt = (iso: string) => deposits.filter((t) => t.occurredAt <= iso).reduce((s, t) => s + (t.kind === "deposit" ? 1 : -1) * (t.totalBase ?? 0), 0);
  const chart = snaps.map((s) => ({ t: Date.parse(s.takenAt), value: s.totalValue, paidIn: deposits.length ? Math.round(paidInAt(s.takenAt) * 100) / 100 : null }));
  const first = snaps[0], last = snaps.at(-1);
  const holdingRows = last?.holdings?.map((h) => {
    const before = first?.holdings?.find((x) => x.key === h.key)?.value ?? null;
    return { ...h, before, change: h.value != null && before != null ? h.value - before : null };
  }) ?? [];

  return (
    <section className="space-y-4" aria-labelledby="track-h">
      <h2 id="track-h" className="text-2xl font-semibold">How it&apos;s been tracking</h2>
      {snaps.length < 2 ? (
        <InfoNote>This builds up from your Trading 212 syncs: every sync records your account value and each holding&apos;s value. {snaps.length === 1 ? "You have one so far; the chart appears after the next sync (at least 15 minutes later)." : "Sync Trading 212 to start the history."}</InfoNote>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
          <Card>
            <CardContent className="pt-6">
              <div className="h-64" role="img" aria-label={`Account value from ${gbp(first!.totalValue)} on ${date(first!.takenAt)} to ${gbp(last!.totalValue)} on ${date(last!.takenAt)}`}>
                <ResponsiveContainer>
                  <LineChart data={chart} margin={{ left: 8, right: 8, top: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="t" type="number" scale="time" domain={["dataMin", "dataMax"]} {...axis} tickFormatter={(t) => new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} />
                    <YAxis {...axis} tickFormatter={short} width={60} domain={["auto", "auto"]} />
                    <Tooltip contentStyle={tooltipStyle} labelFormatter={(t) => new Date(Number(t)).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })} formatter={(v) => gbp(Number(v))} />
                    <Legend />
                    <Line dataKey="value" name="Account value (Trading 212)" stroke="var(--chart-1)" strokeWidth={2} dot={chart.length < 40} />
                    {deposits.length > 0 && <Line dataKey="paidIn" name="Paid in" stroke="var(--chart-2)" strokeWidth={2} strokeDasharray="5 4" dot={false} />}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Values are what Trading 212 reported at each sync, including cash. &ldquo;Paid in&rdquo; uses the deposits fetched so far, so it may miss older ones.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardDescription>Since {date(first!.takenAt)}</CardDescription>
              <CardTitle className={cn("text-2xl tabular", (last!.totalValue! - first!.totalValue!) >= 0 ? "text-gain" : "text-loss")}>{signedGbp(last!.totalValue! - first!.totalValue!)}</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="text-muted-foreground">Change in account value, which includes any money you added. It isn&apos;t all investment growth.</p>
              <ul className="mt-2 divide-y">{holdingRows.map((h) => (
                <li key={h.key} className="flex justify-between gap-3 py-1.5"><span className="truncate">{h.name}</span>
                  <span className={cn("tabular", h.change != null && (h.change >= 0 ? "text-gain" : "text-loss"))}>{h.before == null ? "new" : signedGbp(h.change)}</span></li>
              ))}</ul>
            </CardContent>
          </Card>
        </div>
      )}
    </section>
  );
}

type Proj = ReturnType<typeof project>;
type Risk = ReturnType<typeof riskProfile>;

function TryPurchase({ holdings, base, years, trade, setTrade, current, trial }: {
  holdings: Holding[]; base: string; years: number; trade: TrialTrade | null; setTrade: (t: TrialTrade | null) => void;
  current: { risk: Risk; proj: Proj };
  trial: { error: string } | { holdings: Holding[]; risk: Risk; proj: Proj; extra: number; error: null } | null;
}) {
  const priced = holdings.filter((h) => holdingValue(h, base) != null);
  const [targetKind, setTargetKind] = useState<"existing" | "new">("new");
  const [targetId, setTargetId] = useState(priced[0]?.id ?? "");
  const [name, setName] = useState("");
  const [assetType, setAssetType] = useState<AssetType>("etf");
  const [currency, setCurrency] = useState("GBP");
  const [amount, setAmount] = useState(100);
  const [fundKind, setFundKind] = useState<"new_money" | "sell">("new_money");
  const [sellId, setSellId] = useState(priced[0]?.id ?? "");

  function run(e: React.FormEvent) {
    e.preventDefault();
    setTrade({
      target: targetKind === "existing" ? { kind: "existing", holdingId: targetId } : { kind: "new", name, assetType, currency },
      amount,
      funding: fundKind === "new_money" ? { kind: "new_money" } : { kind: "sell", holdingId: sellId },
    });
  }

  const before = summarize({ baseCurrency: base, holdings });
  const ok = trial && trial.error === null ? trial : null;
  const after = ok ? summarize({ baseCurrency: base, holdings: ok.holdings }) : null;
  const b = current.proj.points[years], a = ok?.proj.points[years];
  const foreign = (s: typeof before) => s.byCurrency.filter((c) => c.label !== base).reduce((x, c) => x + c.weight, 0);
  const rows = after && a ? [
    { label: "Total value now", before: gbp(before.pricedValue), after: gbp(after.pricedValue) },
    { label: "Largest holding", before: `${before.largest?.label ?? "–"} (${pct(before.largest?.weight ?? null, 0)})`, after: `${after.largest?.label ?? "–"} (${pct(after.largest?.weight ?? null, 0)})` },
    { label: "Behaves like this many equal holdings", before: before.effectiveHoldings?.toFixed(1) ?? "–", after: after.effectiveHoldings?.toFixed(1) ?? "–" },
    { label: "Priced in other currencies", before: pct(foreign(before), 0), after: pct(foreign(after), 0) },
    { label: "Average return assumed", before: pct(current.risk.expectedReturn), after: pct(ok!.risk.expectedReturn) },
    { label: "Volatility (yearly ups and downs)", before: pct(current.risk.volatility), after: pct(ok!.risk.volatility) },
    { label: `Middle outcome in ${years} years`, before: gbp(b.p50), after: gbp(a.p50) },
    { label: `Range in ${years} years (8 in 10)`, before: `${short(b.p10)} – ${short(b.p90)}`, after: `${short(a.p10)} – ${short(a.p90)}` },
    { label: "Chance of ending below paid in", before: pct(current.proj.chanceBelowPaidIn, 0), after: pct(ok!.proj.chanceBelowPaidIn, 0) },
  ] : [];

  const notes: string[] = [];
  if (after && ok) {
    if (after.largest && before.largest && Math.abs(after.largest.weight - before.largest.weight) > 0.02)
      notes.push(`Your largest holding would ${after.largest.weight > before.largest.weight ? "grow" : "shrink"} from ${pct(before.largest.weight, 0)} to ${pct(after.largest.weight, 0)} of the portfolio, so one holding's moves would matter ${after.largest.weight > before.largest.weight ? "more" : "less"}.`);
    if (ok.risk.volatility > current.risk.volatility + 0.005) notes.push("Volatility goes up: a wider range of outcomes, in both directions.");
    else if (ok.risk.volatility < current.risk.volatility - 0.005) notes.push("Volatility goes down: a narrower range of outcomes. Lower risk usually also means a lower average return assumption.");
    if (foreign(after) > foreign(before) + 0.02) notes.push("More of your money would be priced in another currency, so exchange-rate moves would affect you more.");
    if (ok.extra > 0) notes.push(`The higher future values partly reflect the extra ${gbp(ok.extra)} you'd be putting in, not just growth.`);
  }

  return (
    <section className="space-y-4" aria-labelledby="try-h">
      <h2 id="try-h" className="text-2xl font-semibold">Try a purchase before you make it</h2>
      <HypotheticalBanner>A test only. Nothing is bought, and your real portfolio isn&apos;t changed. This is a way to understand trade-offs, not a recommendation.</HypotheticalBanner>
      <div className="grid gap-4 lg:grid-cols-[22rem_1fr]">
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={run} className="space-y-4" noValidate>
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Buy</legend>
                <div className="flex gap-2 text-sm">
                  <label className="flex items-center gap-1.5"><input type="radio" name="tk" checked={targetKind === "new"} onChange={() => setTargetKind("new")} />Something new</label>
                  <label className="flex items-center gap-1.5"><input type="radio" name="tk" checked={targetKind === "existing"} onChange={() => setTargetKind("existing")} disabled={!priced.length} />More of a holding</label>
                </div>
                {targetKind === "new" ? (
                  <div className="grid gap-2">
                    <Label htmlFor="try-name" className="text-xs text-muted-foreground">Name</Label>
                    <Input id="try-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. a global bond fund, or a company" maxLength={80} />
                    <div className="grid gap-2">
                      <div className="grid gap-1.5"><Label htmlFor="try-type" className="text-xs text-muted-foreground">Type</Label>
                        <select id="try-type" value={assetType} onChange={(e) => setAssetType(e.target.value as AssetType)} className="h-9 rounded-md border bg-transparent px-2 text-sm">
                          <option value="etf">Diversified fund / ETF</option><option value="share">Individual share</option><option value="bond">Bond fund</option><option value="cash">Cash / money market</option>
                        </select></div>
                      <div className="grid gap-1.5"><Label htmlFor="try-cur" className="text-xs text-muted-foreground">Priced in</Label>
                        <select id="try-cur" value={currency} onChange={(e) => setCurrency(e.target.value)} className="h-9 rounded-md border bg-transparent px-2 text-sm">
                          <option value="GBP">Pounds</option><option value="USD">US dollars</option><option value="EUR">Euros</option>
                        </select></div>
                    </div>
                  </div>
                ) : (
                  <select aria-label="Holding to add to" value={targetId} onChange={(e) => setTargetId(e.target.value)} className="h-9 w-full rounded-md border bg-transparent px-2 text-sm">
                    {priced.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                  </select>
                )}
              </fieldset>
              <NumField label="Amount" suffix="£" value={amount} onChange={setAmount} min={1} max={1_000_000} step="any" />
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Paid for with</legend>
                <div className="flex flex-col gap-1.5 text-sm">
                  <label className="flex items-center gap-1.5"><input type="radio" name="fk" checked={fundKind === "new_money"} onChange={() => setFundKind("new_money")} />New money</label>
                  <label className="flex items-center gap-1.5"><input type="radio" name="fk" checked={fundKind === "sell"} onChange={() => setFundKind("sell")} disabled={!priced.length} />Selling part of a holding</label>
                </div>
                {fundKind === "sell" && (
                  <select aria-label="Holding to sell from" value={sellId} onChange={(e) => setSellId(e.target.value)} className="h-9 w-full rounded-md border bg-transparent px-2 text-sm">
                    {priced.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                  </select>
                )}
                {fundKind === "sell" && <p className="text-xs text-muted-foreground">In a real account, selling at a profit can count towards your capital gains allowance, and trading has costs. Neither is modelled here.</p>}
              </fieldset>
              <div className="flex gap-2">
                <Button type="submit">Show the effect</Button>
                {trade && <Button type="button" variant="ghost" onClick={() => setTrade(null)}>Clear</Button>}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Before and after (hypothetical)</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {!trial && <p className="text-sm text-muted-foreground">Describe a purchase and press &ldquo;Show the effect&rdquo; to compare.</p>}
            {trial?.error && <p className="text-sm text-loss" role="alert">{trial.error}</p>}
            {rows.length > 0 && (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[460px] text-sm">
                    <thead className="text-left text-xs text-muted-foreground"><tr><th className="py-1 font-medium" /><th className="py-1 font-medium">Now</th><th className="py-1 font-medium">After</th></tr></thead>
                    <tbody className="divide-y">{rows.map((r) => (
                      <tr key={r.label}><td className="py-1.5 pr-3 text-muted-foreground">{r.label}</td><td className="py-1.5 pr-3 tabular">{r.before}</td><td className={cn("py-1.5 tabular", r.before !== r.after && "font-medium")}>{r.after}</td></tr>
                    ))}</tbody>
                  </table>
                </div>
                {notes.length > 0 && <ul className="list-disc space-y-1 pl-5 text-sm">{notes.map((n) => <li key={n}>{n}</li>)}</ul>}
                <p className="text-xs text-muted-foreground">Questions worth asking before buying: why this, what would make you sell, and could you leave it alone through a 30% fall? <Link className="underline" href={`/tutor?q=${encodeURIComponent("I'm thinking about a purchase and testing it in the what-if tool. Can you help me think through the trade-offs and the questions I should ask before deciding?")}`}>Talk it through with the tutor</Link>.</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
