"use client";

import { ArrowRight, MessageCircle } from "lucide-react";
import Link from "next/link";
import { getLesson, LESSONS, MODULES } from "@/content";
import { CONCEPT_BY_ID } from "@/content/concepts";
import { useApp } from "@/components/app-state";
import { EducationNote, InfoNote } from "@/components/notes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { date, gbp, pct, signedGbp } from "@/lib/format";
import { dueForReview, MASTERED, needsRevision } from "@/lib/learning/mastery";
import { buildPlan, lessonLinkForConcept, nextLesson } from "@/lib/learning/plan";
import { summarize } from "@/lib/portfolio/metrics";
import { streak } from "@/lib/store/actions";

const SAMPLE_QUESTIONS = ["What exactly am I buying when I buy a share?", "Why can a good company still be a bad investment?", "How do dividends work?"];

/** A takeaway from the course, chosen by date so it changes daily. */
function dailyInsight(now: Date) {
  const all = LESSONS.flatMap(({ lesson }) => lesson.takeaways.map((t) => ({ t, lesson })));
  const dayIndex = Math.floor(now.getTime() / 86_400_000);
  return all[dayIndex % all.length];
}

export function Dashboard() {
  const { data, ready } = useApp();
  if (!ready) return <p className="text-muted-foreground">Loading your progress…</p>;
  const now = new Date(); // after the ready check, so it's never read during prerendering

  const plan = data.prefs ? buildPlan(data.prefs, data.diagnostic?.scoreByConcept ?? null) : null;
  const progress = Object.values(data.lessonProgress);
  const nextId = nextLesson(plan, progress);
  const next = nextId ? getLesson(nextId) : null;
  const available = MODULES.flatMap((m) => m.lessons).length;
  const completed = progress.filter((p) => p.status === "completed").length;
  const concepts = Object.values(data.concepts);
  const mastered = concepts.filter((c) => c.mastery >= MASTERED).length;
  const due = dueForReview(concepts, now);
  const weak = needsRevision(concepts).slice(0, 4);
  const lastAttempt = data.attempts.at(-1);
  const insight = dailyInsight(now);
  const days = streak(data.activityDays, now);
  const summary = data.portfolio && data.portfolio.holdings.length ? summarize(data.portfolio, now) : null;
  const name = data.profile.displayName;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold">{greeting(now)}{name ? `, ${name}` : ""}</h1>
        <p className="text-muted-foreground">{plan ? `Stage: ${plan.stage}` : "Tell us a little about yourself to get a personal plan."}</p>
      </div>

      {!data.onboardedAt && (
        <InfoNote title="New here?">Answer a few questions and take a two-minute knowledge check to get a plan. <Link href="/start" className="font-medium text-primary underline underline-offset-4">Get started</Link></InfoNote>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardDescription>Next lesson</CardDescription>
            <CardTitle className="text-2xl">{next ? next.lesson.title : "You've finished everything available"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {next ? (
              <>
                <p className="text-sm text-muted-foreground">Module {next.module.position} · {next.module.title} · about {next.lesson.minutes} minutes</p>
                <Button asChild><Link href={`/learn/${next.lesson.id}`}>{data.lessonProgress[next.lesson.id] ? "Continue" : "Start"} lesson <ArrowRight /></Link></Button>
              </>
            ) : <p className="text-sm text-muted-foreground">Module 2 is being written. Meanwhile, review concepts below or explore your portfolio.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardDescription>Progress</CardDescription><CardTitle className="text-2xl tabular">{completed} / {available} lessons</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Progress value={available ? (completed / available) * 100 : 0} aria-label="Lessons completed" />
            <p><strong className="tabular">{mastered}</strong> of {concepts.length || 0} concepts practised are at mastery level.</p>
            <p className="text-muted-foreground">Learning streak: <span className="tabular">{days}</span> day{days === 1 ? "" : "s"}. A streak shows habit; your quiz results show understanding.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardDescription>Review</CardDescription><CardTitle>{due.length ? `${due.length} concept${due.length === 1 ? "" : "s"} due` : "Nothing due right now"}</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">Short reviews at growing intervals help ideas stick.</p>
            {due.length > 0 && <Button asChild size="sm"><Link href="/review">Start review</Link></Button>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardDescription>Latest quiz</CardDescription><CardTitle>{lastAttempt ? pct(lastAttempt.score, 0) : "No quizzes yet"}</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {lastAttempt && <p className="text-muted-foreground">{lastAttempt.lessonId ? getLesson(lastAttempt.lessonId)?.lesson.title : lastAttempt.context} · {date(lastAttempt.createdAt)}</p>}
            {weak.length > 0 && (
              <div><p className="mb-1 font-medium">Concepts to revisit</p>
                <ul className="space-y-1">{weak.map((c) => {
                  const link = lessonLinkForConcept(c.conceptId);
                  return <li key={c.conceptId}>{link ? <Link className="text-primary underline underline-offset-4" href={`/learn/${link.lessonId}`}>{CONCEPT_BY_ID.get(c.conceptId)?.title}</Link> : CONCEPT_BY_ID.get(c.conceptId)?.title}</li>;
                })}</ul>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardDescription>Today&apos;s insight</CardDescription><CardTitle className="font-sans text-base font-medium leading-snug">{insight.t}</CardTitle></CardHeader>
          <CardContent><Link href={`/learn/${insight.lesson.id}`} className="text-sm text-primary underline underline-offset-4">From: {insight.lesson.title}</Link></CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardDescription>Your portfolio</CardDescription><CardTitle>{summary ? (summary.totalValue != null ? gbp(summary.totalValue) : "Value partly unknown") : "Nothing added yet"}</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {!summary && <p className="text-muted-foreground">You don&apos;t need to invest to use Groundwork. When you&apos;re ready, add holdings or import your Trading 212 history to learn with your own numbers.</p>}
            {summary && (
              <>
                {summary.unpriced.length > 0 && <p>{summary.unpriced.length} holding{summary.unpriced.length === 1 ? " has" : "s have"} no current price, so the total isn&apos;t known. Priced holdings: {gbp(summary.pricedValue)}.</p>}
                {summary.unrealised && <p>Unrealised gain or loss: <span className={summary.unrealised.amount >= 0 ? "text-gain" : "text-loss"}>{signedGbp(summary.unrealised.amount)}</span> across {summary.unrealised.holdingsCounted} of {summary.unrealised.holdingsTotal} holdings.</p>}
                {summary.largest && summary.largest.weight >= 0.4 && summary.allocation.length > 1 && (
                  <InfoNote title="Something to understand:">{summary.largest.label} is {pct(summary.largest.weight, 0)} of your priced holdings. If it fell 20%, your whole portfolio would fall about {pct(summary.largest.weight * 0.2, 0)}. That&apos;s concentration risk.</InfoNote>
                )}
                {summary.stale.length > 0 && <p className="text-muted-foreground">Some prices are over a week old. Update them in Portfolio for accurate figures.</p>}
              </>
            )}
            <Button asChild size="sm" variant="outline"><Link href="/portfolio">Open portfolio</Link></Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardDescription>Ask the tutor</CardDescription><CardTitle className="flex items-center gap-2"><MessageCircle className="size-5 text-primary" aria-hidden />Got a question?</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {SAMPLE_QUESTIONS.map((q) => (
              <Link key={q} href={`/tutor?q=${encodeURIComponent(q)}`}><Badge variant="outline" className="cursor-pointer whitespace-normal py-1 text-left font-normal hover:bg-muted">{q}</Badge></Link>
            ))}
          </CardContent>
        </Card>
      </div>
      <EducationNote />
    </div>
  );
}

function greeting(d: Date) {
  const h = d.getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}
