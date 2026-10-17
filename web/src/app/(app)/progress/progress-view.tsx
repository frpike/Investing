"use client";

import Link from "next/link";
import { getLesson, MODULES } from "@/content";
import { CONCEPTS } from "@/content/concepts";
import { useApp } from "@/components/app-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { date, pct } from "@/lib/format";
import { MASTERED } from "@/lib/learning/mastery";
import { calibrationGap } from "@/lib/learning/scoring";
import { lessonLinkForConcept } from "@/lib/learning/plan";
import { streak } from "@/lib/store/actions";
import { cn } from "@/lib/utils";

export function ProgressView() {
  const { data, ready } = useApp();
  if (!ready) return <p className="text-muted-foreground">Loading…</p>;
  const now = new Date();
  const gap = calibrationGap(data.attempts);
  const completed = Object.values(data.lessonProgress).filter((p) => p.status === "completed");
  const topics = Object.entries(data.tutorTopics).sort((a, b) => b[1] - a[1]).slice(0, 8);

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold">Progress and knowledge</h1>
        <p className="text-muted-foreground">What you&apos;ve shown you understand, measured by quiz answers. Time spent and streaks don&apos;t count towards mastery.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader><CardDescription>Lessons completed</CardDescription><CardTitle className="text-2xl tabular">{completed.length}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>Quizzes taken</CardDescription><CardTitle className="text-2xl tabular">{data.attempts.length}</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">Average score: {data.attempts.length ? pct(data.attempts.reduce((s, a) => s + a.score, 0) / data.attempts.length, 0) : "–"}</CardContent></Card>
        <Card><CardHeader><CardDescription>Confidence vs results</CardDescription>
          <CardTitle className="text-lg">{gap == null ? "Not enough data yet" : Math.abs(gap) < 0.15 ? "Well calibrated" : gap > 0 ? "More confident than accurate" : "Less confident than you should be"}</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">{gap == null ? "Rate your confidence before checking quiz answers; after three quizzes you'll see how it compares." : gap > 0.15 ? "Overconfidence is one of the most expensive habits in investing. Slow down on topics that feel easy." : "Your results are good; trust them a bit more."} Learning streak: {streak(data.activityDays, now)} days.</CardContent></Card>
      </div>

      <section className="space-y-4" aria-labelledby="concept-map">
        <h2 id="concept-map" className="text-2xl font-semibold">Concept map</h2>
        <p className="text-sm text-muted-foreground">Each concept builds on others. Mastery rises with correct answers and falls with wrong ones; reviews come back at growing intervals.</p>
        {MODULES.filter((m) => CONCEPTS.some((c) => c.moduleId === m.id)).map((m) => (
          <Card key={m.id}>
            <CardHeader><CardTitle className="text-lg">Module {m.position}: {m.title}</CardTitle></CardHeader>
            <CardContent>
              <ul className="grid gap-3 sm:grid-cols-2">
                {CONCEPTS.filter((c) => c.moduleId === m.id).map((c) => {
                  const st = data.concepts[c.id];
                  const link = lessonLinkForConcept(c.id);
                  return (
                    <li key={c.id} className="space-y-1">
                      <div className="flex items-center justify-between gap-2 text-sm">
                        {link ? <Link href={`/learn/${link.lessonId}`} className="hover:underline">{c.title}</Link> : <span className="text-muted-foreground">{c.title}</span>}
                        <span className="text-xs text-muted-foreground tabular">{st ? pct(st.mastery, 0) : "not started"}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted" role="progressbar" aria-label={`${c.title} mastery`} aria-valuenow={Math.round((st?.mastery ?? 0) * 100)} aria-valuemin={0} aria-valuemax={100}>
                        <div className={cn("h-full rounded-full", (st?.mastery ?? 0) >= MASTERED ? "bg-gain" : "bg-primary")} style={{ width: `${(st?.mastery ?? 0) * 100}%` }} />
                      </div>
                      {st?.dueAt && <p className="text-xs text-muted-foreground">Next review {date(st.dueAt)}</p>}
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        ))}
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-lg">Recent quizzes</CardTitle></CardHeader>
          <CardContent>
            {data.attempts.length === 0 ? <p className="text-sm text-muted-foreground">None yet.</p> : (
              <ul className="divide-y text-sm">
                {data.attempts.slice(-10).reverse().map((a) => (
                  <li key={a.id} className="flex justify-between py-2">
                    <span>{a.lessonId ? getLesson(a.lessonId)?.lesson.title : a.context === "review" ? "Review" : "Knowledge check"} · {date(a.createdAt)}</span>
                    <span className="tabular">{pct(a.score, 0)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-lg">Topics you&apos;ve asked the tutor about</CardTitle></CardHeader>
          <CardContent>
            {topics.length === 0 ? <p className="text-sm text-muted-foreground">None yet.</p> : (
              <ul className="space-y-1 text-sm">{topics.map(([c, n]) => <li key={c} className="flex justify-between"><span>{CONCEPTS.find((x) => x.id === c)?.title ?? c}</span><span className="tabular text-muted-foreground">{n}×</span></li>)}</ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
