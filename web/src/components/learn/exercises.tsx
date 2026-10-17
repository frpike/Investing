"use client";

import { useId, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ExerciseKindT } from "@/content/schema";
import { HypotheticalBanner } from "@/components/notes";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { gbp } from "@/lib/format";

// Interactive calculators used inside lessons. All maths is shown in plain numbers next to the chart.

function Field({ label, value, onChange, min, max, step, suffix }: {
  label: string; value: number; onChange: (n: number) => void; min: number; max: number; step: number; suffix?: string;
}) {
  const id = useId();
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">{label}{suffix ? ` (${suffix})` : ""}</Label>
      <Input id={id} type="number" inputMode="decimal" value={Number.isFinite(value) ? value : ""} min={min} max={max} step={step}
        onChange={(e) => { const n = Number(e.target.value); onChange(Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min); }} />
    </div>
  );
}

const axis = { stroke: "var(--muted-foreground)", fontSize: 12 };
const short = (v: number) => (v >= 1e6 ? `£${(v / 1e6).toFixed(1)}m` : v >= 1e3 ? `£${Math.round(v / 1e3)}k` : `£${Math.round(v)}`);
const tooltipStyle = { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--popover-foreground)" };

export function growthSeries(start: number, monthly: number, ratePct: number, years: number) {
  const r = Math.pow(1 + ratePct / 100, 1 / 12) - 1;
  let v = start, paid = start;
  const out = [{ year: 0, value: start, paid: start }];
  for (let m = 1; m <= years * 12; m++) {
    v = v * (1 + r) + monthly;
    paid += monthly;
    if (m % 12 === 0) out.push({ year: m / 12, value: Math.round(v * 100) / 100, paid });
  }
  return out;
}

function Compound() {
  const [start, setStart] = useState(1000);
  const [monthly, setMonthly] = useState(50);
  const [rate, setRate] = useState(5);
  const [years, setYears] = useState(20);
  const data = useMemo(() => growthSeries(start, monthly, rate, years), [start, monthly, rate, years]);
  const end = data[data.length - 1];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Starting amount" suffix="£" value={start} onChange={setStart} min={0} max={1_000_000} step={100} />
        <Field label="Added each month" suffix="£" value={monthly} onChange={setMonthly} min={0} max={10_000} step={10} />
        <Field label="Yearly growth" suffix="%" value={rate} onChange={setRate} min={-10} max={15} step={0.5} />
        <Field label="Years" value={years} onChange={setYears} min={1} max={50} step={1} />
      </div>
      <div className="h-60" role="img" aria-label={`Value grows to ${gbp(end.value)} after ${years} years from ${gbp(end.paid)} paid in`}>
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ left: 8, right: 8, top: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="year" {...axis} tickFormatter={(y) => `${y}y`} />
            <YAxis {...axis} tickFormatter={short} width={56} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => gbp(Number(v))} labelFormatter={(y) => `After ${y} years`} />
            <Legend />
            <Area type="monotone" dataKey="value" name="Value" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.15} strokeWidth={2} />
            <Area type="monotone" dataKey="paid" name="Paid in" stroke="var(--chart-2)" fill="transparent" strokeDasharray="5 4" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="text-sm">
        You&apos;d pay in <strong className="tabular">{gbp(end.paid)}</strong>. At a steady {rate}% a year it would be worth{" "}
        <strong className="tabular">{gbp(end.value)}</strong>, of which <strong className="tabular">{gbp(end.value - end.paid)}</strong> is growth.
      </p>
      <HypotheticalBanner>Real returns are not steady: some years are much better or worse. This shows the arithmetic of compounding, not a forecast.</HypotheticalBanner>
    </div>
  );
}

function Inflation() {
  const [amount, setAmount] = useState(100);
  const [rate, setRate] = useState(3);
  const [years, setYears] = useState(10);
  const factor = Math.pow(1 + rate / 100, years);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Field label="Amount" suffix="£" value={amount} onChange={setAmount} min={0} max={1_000_000} step={10} />
        <Field label="Inflation" suffix="% a year" value={rate} onChange={setRate} min={0} max={20} step={0.5} />
        <Field label="Years" value={years} onChange={setYears} min={1} max={50} step={1} />
      </div>
      <dl className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg bg-muted p-4"><dt className="text-xs text-muted-foreground">What today&apos;s {gbp(amount)} of shopping would cost</dt><dd className="text-xl font-semibold tabular">{gbp(amount * factor)}</dd></div>
        <div className="rounded-lg bg-muted p-4"><dt className="text-xs text-muted-foreground">What {gbp(amount)} in cash would buy, in today&apos;s money</dt><dd className="text-xl font-semibold tabular">{gbp(amount / factor)}</dd></div>
      </dl>
      <p className="text-sm text-muted-foreground tabular">Working: {gbp(amount)} × (1 + {rate / 100})^{years} = {gbp(amount * factor)}; {gbp(amount)} ÷ {factor.toFixed(3)} = {gbp(amount / factor)}.</p>
    </div>
  );
}

function SimpleVsCompound() {
  const [rate, setRate] = useState(5);
  const [years, setYears] = useState(30);
  const data = Array.from({ length: years + 1 }, (_, y) => ({ year: y, simple: 1000 * (1 + (rate / 100) * y), compound: Math.round(1000 * Math.pow(1 + rate / 100, y) * 100) / 100 }));
  const end = data[years];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Yearly rate" suffix="%" value={rate} onChange={setRate} min={0} max={15} step={0.5} />
        <Field label="Years" value={years} onChange={setYears} min={1} max={50} step={1} />
      </div>
      <div className="h-56" role="img" aria-label={`After ${years} years: simple ${gbp(end.simple)}, compound ${gbp(end.compound)}`}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ left: 8, right: 8, top: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="year" {...axis} tickFormatter={(y) => `${y}y`} />
            <YAxis {...axis} tickFormatter={short} width={56} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => gbp(Number(v))} labelFormatter={(y) => `Year ${y}`} />
            <Legend />
            <Line type="monotone" dataKey="compound" name="Compound" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="simple" name="Simple" stroke="var(--chart-2)" strokeWidth={2} dot={false} strokeDasharray="5 4" />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-sm">Starting from £1,000: simple gives <strong className="tabular">{gbp(end.simple)}</strong>, compound gives <strong className="tabular">{gbp(end.compound)}</strong>.</p>
    </div>
  );
}

function PercentChange() {
  const [fall, setFall] = useState(30);
  const needed = fall >= 100 ? null : fall / (100 - fall);
  return (
    <div className="space-y-4">
      <Field label="Fall" suffix="%" value={fall} onChange={setFall} min={1} max={99} step={1} />
      <p className="text-lg">A {fall}% fall needs a <strong className="tabular">{needed == null ? "—" : `${(needed * 100).toFixed(1)}%`}</strong> rise to get back to even.</p>
      <p className="text-sm text-muted-foreground tabular">Working: £100 × {(1 - fall / 100).toFixed(2)} = £{(100 - fall).toFixed(2)}; to get back to £100 it must grow by {fall} ÷ {100 - fall} = {needed == null ? "—" : `${(needed * 100).toFixed(1)}%`}.</p>
    </div>
  );
}

function TimeInMarket() {
  const [monthly, setMonthly] = useState(150);
  const [years, setYears] = useState(15);
  const [crashYear, setCrashYear] = useState(5);
  const rate = 6;
  const data = useMemo(() => {
    const r = Math.pow(1.06, 1 / 12) - 1;
    let smooth = 0, bumpy = 0, paid = 0;
    const out = [{ year: 0, smooth: 0, bumpy: 0, paid: 0 }];
    for (let m = 1; m <= years * 12; m++) {
      smooth = smooth * (1 + r) + monthly;
      // Path B: a 30% fall spread over the 12 months of the chosen year, otherwise the same growth.
      const inCrash = Math.ceil(m / 12) === crashYear;
      bumpy = bumpy * (inCrash ? Math.pow(0.7, 1 / 12) : 1 + r) + monthly;
      paid += monthly;
      if (m % 12 === 0) out.push({ year: m / 12, smooth: Math.round(smooth), bumpy: Math.round(bumpy), paid });
    }
    return out;
  }, [monthly, years, crashYear]);
  const end = data[data.length - 1];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Field label="Each month" suffix="£" value={monthly} onChange={setMonthly} min={0} max={5000} step={10} />
        <Field label="Years" value={years} onChange={setYears} min={2} max={40} step={1} />
        <Field label="Year of a 30% fall" value={crashYear} onChange={setCrashYear} min={1} max={years} step={1} />
      </div>
      <div className="h-56" role="img" aria-label={`Smooth path ends at ${gbp(end.smooth)}; path with a fall ends at ${gbp(end.bumpy)}; paid in ${gbp(end.paid)}`}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ left: 8, right: 8, top: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="year" {...axis} tickFormatter={(y) => `${y}y`} />
            <YAxis {...axis} tickFormatter={short} width={56} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => gbp(Number(v))} labelFormatter={(y) => `Year ${y}`} />
            <Legend />
            <Line dataKey="smooth" name={`Steady ${rate}%`} stroke="var(--chart-1)" strokeWidth={2} dot={false} />
            <Line dataKey="bumpy" name="With a 30% fall" stroke="var(--chart-5)" strokeWidth={2} dot={false} />
            <Line dataKey="paid" name="Paid in" stroke="var(--chart-2)" strokeWidth={2} dot={false} strokeDasharray="5 4" />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-sm">Paid in: <strong className="tabular">{gbp(end.paid)}</strong>. Steady path: <strong className="tabular">{gbp(end.smooth)}</strong>. Path with a fall: <strong className="tabular">{gbp(end.bumpy)}</strong>. Money added just after the fall buys at lower prices, then grows with everything else.</p>
      <HypotheticalBanner>Both paths are made up to show the mechanics. Neither is historical data or a forecast, and real recoveries can take much longer.</HypotheticalBanner>
    </div>
  );
}

export function Exercise({ kind }: { kind: ExerciseKindT }) {
  switch (kind) {
    case "compound": return <Compound />;
    case "inflation": return <Inflation />;
    case "simpleVsCompound": return <SimpleVsCompound />;
    case "percentChange": return <PercentChange />;
    case "timeInMarket": return <TimeInMarket />;
  }
}
