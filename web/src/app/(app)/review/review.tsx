"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { QUESTIONS } from "@/content";
import { CONCEPT_BY_ID } from "@/content/concepts";
import { useApp } from "@/components/app-state";
import { QuizRunner } from "@/components/learn/quiz-runner";
import { Button } from "@/components/ui/button";
import { dueForReview, needsRevision } from "@/lib/learning/mastery";

// Spaced-repetition review: up to five questions on concepts that are due (or weakest),
// preferring questions the learner hasn't seen most recently.
export function Review() {
  const { data, ready } = useApp();
  const [round, setRound] = useState(0);
  const questions = useMemo(() => {
    if (!ready) return [];
    const concepts = Object.values(data.concepts);
    const targets = [...dueForReview(concepts, new Date()), ...needsRevision(concepts)].map((c) => c.conceptId)
      .filter((c, i, a) => a.indexOf(c) === i).slice(0, 5);
    const recent = new Set(data.attempts.slice(-3).flatMap((a) => Object.keys(a.answers)));
    return targets.flatMap((c) => {
      const pool = [...QUESTIONS.values()].filter((q) => q.conceptId === c);
      const pick = pool.find((q) => !recent.has(q.id)) ?? pool[0];
      return pick ? [pick] : [];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, round]);

  if (!ready) return <p className="text-muted-foreground">Loading…</p>;
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-3xl font-semibold">Review</h1>
      {questions.length === 0 ? (
        <div className="space-y-3">
          <p className="text-muted-foreground">Nothing to review yet. Concepts appear here after you&apos;ve answered quiz questions on them, at growing intervals.</p>
          <Button asChild><Link href="/learn">Go to the course</Link></Button>
        </div>
      ) : (
        <>
          <p className="text-muted-foreground">Covering: {[...new Set(questions.map((q) => CONCEPT_BY_ID.get(q.conceptId)?.title))].join(", ")}.</p>
          <QuizRunner key={round} questions={questions} lessonId={null} context="review" />
          <Button variant="outline" onClick={() => setRound((r) => r + 1)}>New review set</Button>
        </>
      )}
    </div>
  );
}
