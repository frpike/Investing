"use client";

import Link from "next/link";
import { useState } from "react";
import type { Question } from "@/content/schema";
import { CONCEPT_BY_ID } from "@/content/concepts";
import { useApp } from "@/components/app-state";
import { Button } from "@/components/ui/button";
import { unmetPrerequisites } from "@/lib/learning/graph";
import { lessonLinkForConcept } from "@/lib/learning/plan";
import type { QuizScore } from "@/lib/learning/scoring";
import type { AttemptContext } from "@/lib/learning/types";
import { newId } from "@/lib/format";
import { PASS_MARK, recordQuiz } from "@/lib/store/actions";
import { cn } from "@/lib/utils";
import { QuestionCard } from "./question-card";

const CONFIDENCE = ["Guessing", "Unsure", "Fairly sure", "Confident", "Certain"];

export function QuizRunner({ questions, lessonId, context, onDone }: {
  questions: Question[];
  lessonId: string | null;
  context: AttemptContext;
  onDone?: (score: QuizScore) => void;
}) {
  const { apply, data } = useApp();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [confidence, setConfidence] = useState<number | null>(null);
  const [score, setScore] = useState<QuizScore | null>(null);
  const allAnswered = questions.every((q) => answers[q.id]);

  async function submit() {
    let result: QuizScore | null = null;
    await apply((d) => {
      const [next, change, s] = recordQuiz(d, { lessonId, context, questions, answers, confidence }, new Date(), newId());
      result = s;
      return [next, change];
    });
    setScore(result);
    if (result) onDone?.(result);
  }

  const mastery = Object.fromEntries(Object.entries(data.concepts).map(([k, v]) => [k, v.mastery]));

  return (
    <div className="space-y-8">
      {questions.map((q, i) => (
        <QuestionCard key={q.id} index={i} question={q} chosen={answers[q.id]} revealed={!!score}
          onChoose={(o) => setAnswers((a) => ({ ...a, [q.id]: o }))} />
      ))}

      {!score && (
        <div className="space-y-4 rounded-xl border bg-card p-5">
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Before you check: how confident are you in these answers?</legend>
            <div className="flex flex-wrap gap-2">
              {CONFIDENCE.map((label, i) => (
                <button key={label} type="button" onClick={() => setConfidence(i + 1)} aria-pressed={confidence === i + 1}
                  className={cn("rounded-full border px-3 py-1 text-sm", confidence === i + 1 ? "border-primary bg-accent font-medium" : "hover:bg-muted")}>
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Comparing confidence with results helps you spot over- or under-confidence. It doesn&apos;t affect your score.</p>
          </fieldset>
          <Button onClick={submit} disabled={!allAnswered}>Check my answers</Button>
          {!allAnswered && <p className="text-xs text-muted-foreground">Answer every question to check them.</p>}
        </div>
      )}

      {score && (
        <div className="space-y-4 rounded-xl border bg-card p-5" aria-live="polite">
          <p className="text-lg font-semibold tabular">{score.correct} of {score.total} correct</p>
          {context === "lesson" && (score.score >= PASS_MARK
            ? <p className="text-gain">Lesson complete. The concepts are scheduled for a short review later, so they stick.</p>
            : <p>Not quite there yet. Re-read the parts linked below and try again; the lesson stays open until you pass.</p>)}
          {score.conceptsToRevisit.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium">Worth revisiting</p>
              <ul className="space-y-1 text-sm">
                {score.conceptsToRevisit.flatMap((c) => [...unmetPrerequisites(c, mastery), c])
                  .filter((c, i, arr) => arr.indexOf(c) === i)
                  .map((c) => {
                    const link = lessonLinkForConcept(c);
                    return (
                      <li key={c}>
                        {CONCEPT_BY_ID.get(c)?.title ?? c}
                        {link ? <> · <Link className="text-primary underline underline-offset-4" href={`/learn/${link.lessonId}`}>{link.title}</Link></> : <span className="text-muted-foreground"> · covered in a later module</span>}
                      </li>
                    );
                  })}
              </ul>
            </div>
          )}
          <Button variant="outline" onClick={() => { setAnswers({}); setScore(null); setConfidence(null); }}>Try again</Button>
        </div>
      )}
    </div>
  );
}
