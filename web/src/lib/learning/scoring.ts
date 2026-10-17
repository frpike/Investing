import type { Question } from "@/content/schema";
import { NOT_SURE } from "@/content/diagnostic";

export interface QuestionResult {
  questionId: string;
  conceptId: string;
  chosen: string | null;
  correct: boolean;
  /** True when the learner said "I'm not sure" or skipped; counted as not known, not as wrong. */
  unsure: boolean;
}

export interface QuizScore {
  results: QuestionResult[];
  correct: number;
  total: number;
  /** correct ÷ total; unanswered and "not sure" count as not correct. */
  score: number;
  /** Concepts with at least one wrong or unsure answer, in question order, without duplicates. */
  conceptsToRevisit: string[];
}

export function scoreQuiz(questions: Question[], answers: Record<string, string | undefined>): QuizScore {
  const results = questions.map((q): QuestionResult => {
    const chosen = answers[q.id] ?? null;
    const unsure = chosen === null || chosen === NOT_SURE;
    return { questionId: q.id, conceptId: q.conceptId, chosen, correct: !unsure && chosen === q.correctOptionId, unsure };
  });
  const correct = results.filter((r) => r.correct).length;
  const conceptsToRevisit = [...new Set(results.filter((r) => !r.correct).map((r) => r.conceptId))];
  return { results, correct, total: questions.length, score: questions.length ? correct / questions.length : 0, conceptsToRevisit };
}

/** Diagnostic score per concept: 1 = answered correctly, 0 = wrong or not sure. */
export function scoreByConcept(score: QuizScore): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of score.results) out[r.conceptId] = r.correct ? 1 : 0;
  return out;
}

/**
 * Confidence calibration: how a learner's self-rated confidence (1–5) compares with their accuracy.
 * Positive = more confident than accurate. Needs at least 3 rated attempts.
 */
export function calibrationGap(attempts: { score: number; confidence: number | null }[]): number | null {
  const rated = attempts.filter((a) => a.confidence != null);
  if (rated.length < 3) return null;
  const conf = rated.reduce((s, a) => s + (a.confidence! - 1) / 4, 0) / rated.length;
  const acc = rated.reduce((s, a) => s + a.score, 0) / rated.length;
  return conf - acc;
}
