"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DIAGNOSTIC } from "@/content/diagnostic";
import { MODULES } from "@/content";
import { useApp } from "@/components/app-state";
import { QuestionCard } from "@/components/learn/question-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { buildPlan } from "@/lib/learning/plan";
import type { LearningPreferences } from "@/lib/learning/types";
import { recordDiagnostic, setPrefs } from "@/lib/store/actions";
import { cn } from "@/lib/utils";

type Opt<T extends string | number> = { value: T; label: string; hint?: string };

const STEPS = [
  { key: "experience", title: "How much investing have you done?", options: [
    { value: "none", label: "None at all" }, { value: "a_little", label: "A little", hint: "I've bought something once or twice" },
    { value: "some", label: "Some", hint: "I invest but don't feel sure why things move" }, { value: "confident", label: "Quite a lot" },
  ] },
  { key: "goals", multi: true, title: "What would you like investing to help with?", options: [
    { value: "learn", label: "Just understanding how it works" }, { value: "long_term_wealth", label: "Building wealth over the long term" },
    { value: "house", label: "A home deposit" }, { value: "retirement", label: "Retirement" }, { value: "income", label: "Extra income" }, { value: "other", label: "Something else" },
  ] },
  { key: "horizon", title: "Roughly when might you need money you invest?", options: [
    { value: "under_2y", label: "Within 2 years" }, { value: "2_5y", label: "2 to 5 years" }, { value: "5_10y", label: "5 to 10 years" },
    { value: "over_10y", label: "More than 10 years" }, { value: "unsure", label: "Not sure yet" },
  ] },
  { key: "regularFrequency", title: "Do you plan to invest regularly?", options: [
    { value: "daily", label: "Yes, daily" }, { value: "weekly", label: "Yes, weekly" }, { value: "monthly", label: "Yes, monthly" }, { value: "none", label: "No, or not yet" },
  ] },
  { key: "hasTrading212", title: "Do you have a Trading 212 account?", options: [
    { value: "yes", label: "Yes" }, { value: "planning", label: "Not yet, but I'm planning to" }, { value: "no", label: "No" },
  ] },
  { key: "focus", title: "What would you most like to learn about?", options: [
    { value: "long_term", label: "Long-term investing", hint: "Funds, diversification, staying the course" },
    { value: "companies", label: "Individual companies", hint: "Reading the numbers, building a thesis" },
    { value: "both", label: "Both" },
  ] },
  { key: "numeracyConfidence", title: "How comfortable are you with percentages and compound growth?", options: [
    { value: 1, label: "Not at all" }, { value: 2, label: "A bit rusty" }, { value: 3, label: "Okay" }, { value: 4, label: "Comfortable" }, { value: 5, label: "Very comfortable" },
  ] },
] as const satisfies { key: keyof LearningPreferences; title: string; multi?: boolean; options: Opt<string | number>[] }[];

export function Onboarding() {
  const { apply, data } = useApp();
  const router = useRouter();
  const [name, setName] = useState(data.profile.displayName ?? "");
  const [prefs, setPrefsState] = useState<LearningPreferences>(data.prefs ?? { goals: [], skipped: [] });
  const [amount, setAmount] = useState<string>(data.prefs?.regularAmountGbp?.toString() ?? "");
  const [step, setStep] = useState(0); // 0 = name, 1..STEPS = questions, then diagnostic, then plan
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [diagDone, setDiagDone] = useState(false);
  const totalSteps = STEPS.length + 2;
  const diagStep = STEPS.length + 1;

  const q = step >= 1 && step <= STEPS.length ? STEPS[step - 1] : null;
  const skip = (key: string) => setPrefsState((p) => ({ ...p, skipped: [...new Set([...(p.skipped ?? []), key])] }));
  const choose = (key: string, value: string | number, multi?: boolean) =>
    setPrefsState((p) => {
      const skipped = (p.skipped ?? []).filter((s) => s !== key);
      if (!multi) return { ...p, skipped, [key]: value };
      const cur = new Set(p.goals ?? []);
      if (cur.has(value as string)) cur.delete(value as string); else cur.add(value as string);
      return { ...p, skipped, goals: [...cur] };
    });

  async function savePrefs() {
    const n = Number(amount);
    const final: LearningPreferences = { ...prefs, regularAmountGbp: amount && Number.isFinite(n) && n >= 0 ? n : null };
    await apply((d) => setPrefs(d, final, new Date(), name.trim() || null));
  }

  async function finishDiagnostic() {
    await savePrefs();
    await apply((d) => { const [next, change] = recordDiagnostic(d, DIAGNOSTIC, answers, new Date()); return [next, change]; });
    setDiagDone(true);
    setStep(diagStep + 1);
  }

  const plan = buildPlan(prefs, diagDone ? Object.fromEntries(DIAGNOSTIC.map((d) => [d.conceptId, answers[d.id] === d.correctOptionId ? 1 : 0])) : null);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Getting started · {Math.min(step + 1, totalSteps)} of {totalSteps}</p>
        <Progress value={(Math.min(step, totalSteps) / totalSteps) * 100} aria-label="Onboarding progress" />
      </div>

      {step === 0 && (
        <Card>
          <CardHeader><CardTitle className="text-2xl">Let&apos;s shape the course around you</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <p className="text-muted-foreground">A few quick questions, then a short quiz to find your starting point. Skip anything you like and change it later in Settings. We only use what you tell us here; we never guess things about you from your age, job or balance.</p>
            <div className="grid gap-2">
              <Label htmlFor="name">What should we call you? (optional)</Label>
              <Input id="name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} autoComplete="given-name" />
            </div>
            <Button onClick={() => setStep(1)}>Continue</Button>
          </CardContent>
        </Card>
      )}

      {q && (
        <Card>
          <CardHeader><CardTitle className="text-2xl">{q.title}</CardTitle>{"multi" in q && q.multi && <p className="text-sm text-muted-foreground">Pick as many as you like.</p>}</CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-2" role={"multi" in q && q.multi ? "group" : "radiogroup"} aria-label={q.title}>
              {q.options.map((o) => {
                const selected = "multi" in q && q.multi ? (prefs.goals ?? []).includes(o.value as string) : prefs[q.key] === o.value;
                return (
                  <button key={String(o.value)} type="button" onClick={() => choose(q.key, o.value, "multi" in q && q.multi)}
                    role={"multi" in q && q.multi ? "checkbox" : "radio"} aria-checked={selected}
                    className={cn("rounded-lg border px-4 py-3 text-left transition-colors", selected ? "border-primary bg-accent" : "hover:bg-muted")}>
                    <span className="font-medium">{o.label}</span>
                    {"hint" in o && o.hint && <span className="block text-sm text-muted-foreground">{o.hint}</span>}
                  </button>
                );
              })}
            </div>
            {q.key === "regularFrequency" && prefs.regularFrequency && prefs.regularFrequency !== "none" && (
              <div className="grid gap-2">
                <Label htmlFor="amount">About how much each time? (£, optional)</Label>
                <Input id="amount" type="number" min={0} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className="max-w-40" />
              </div>
            )}
            <div className="flex gap-2">
              <Button onClick={() => setStep(step + 1)}>Continue</Button>
              <Button variant="ghost" onClick={() => { skip(q.key); setStep(step + 1); }}>Skip</Button>
              <Button variant="ghost" className="ml-auto" onClick={() => setStep(step - 1)}>Back</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === diagStep && (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">A quick knowledge check</CardTitle>
            <p className="text-muted-foreground">Seven questions, one per topic. This isn&apos;t a test you can fail: choose &ldquo;I&apos;m not sure yet&rdquo; whenever that&apos;s true, so your plan starts in the right place.</p>
          </CardHeader>
          <CardContent className="space-y-8">
            {DIAGNOSTIC.map((d, i) => (
              <div key={d.id} className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{d.topic}</p>
                <QuestionCard index={i} question={d} chosen={answers[d.id]} revealed={false} onChoose={(o) => setAnswers((a) => ({ ...a, [d.id]: o }))} />
              </div>
            ))}
            <div className="flex gap-2">
              <Button onClick={finishDiagnostic}>See my plan</Button>
              <Button variant="ghost" onClick={async () => { await savePrefs(); setStep(diagStep + 1); }}>Skip the quiz</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step > diagStep && (
        <Card>
          <CardHeader><CardTitle className="text-2xl">Your starting plan</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p><span className="text-muted-foreground">Stage:</span> <strong>{plan.stage}</strong></p>
            <ul className="list-disc space-y-1 pl-5">{plan.notes.map((n) => <li key={n}>{n}</li>)}</ul>
            {diagDone && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Your quiz answers</p>
                <ul className="grid gap-1 text-sm sm:grid-cols-2">
                  {DIAGNOSTIC.map((d) => (
                    <li key={d.id} className="flex items-center gap-2">
                      <span className={cn("size-2 rounded-full", answers[d.id] === d.correctOptionId ? "bg-gain" : "bg-muted-foreground/40")} aria-hidden />
                      {d.topic}: {answers[d.id] === d.correctOptionId ? "known" : "to learn"}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-sm text-muted-foreground">Suggested module order: {plan.moduleOrder.map((id) => MODULES.find((m) => m.id === id)?.position).join(" → ")}. You can take lessons in any order, and retake this quiz in Settings.</p>
            <Button onClick={() => router.push("/dashboard")}>Go to my dashboard</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
