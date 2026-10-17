import type { ConceptState } from "./types";

// Mastery and spaced repetition. A correct answer raises mastery and pushes the next
// review further out; a wrong answer halves mastery and brings the review back to tomorrow.
// Deliberately simple (SM-2 flavoured) so it is easy to reason about and test.

const DAY = 86_400_000;
export const MASTERED = 0.8;

export function emptyConcept(conceptId: string): ConceptState {
  return { conceptId, mastery: 0, correct: 0, incorrect: 0, intervalDays: 0, ease: 2.5, dueAt: null, lastSeenAt: null };
}

export function applyAnswer(prev: ConceptState, correct: boolean, now: Date): ConceptState {
  const s = { ...prev, lastSeenAt: now.toISOString() };
  if (correct) {
    s.correct += 1;
    s.mastery = round(s.mastery + (1 - s.mastery) * 0.35);
    s.intervalDays = s.intervalDays < 1 ? 1 : s.intervalDays < 3 ? 3 : round(s.intervalDays * s.ease);
    s.ease = Math.min(3, round(s.ease + 0.05));
  } else {
    s.incorrect += 1;
    s.mastery = round(s.mastery * 0.5);
    s.intervalDays = 1;
    s.ease = Math.max(1.3, round(s.ease - 0.2));
  }
  s.intervalDays = Math.min(s.intervalDays, 180);
  s.dueAt = new Date(now.getTime() + s.intervalDays * DAY).toISOString();
  return s;
}

/** Concepts due for review now, most overdue first. */
export function dueForReview(states: ConceptState[], now: Date): ConceptState[] {
  return states
    .filter((s) => s.dueAt && Date.parse(s.dueAt) <= now.getTime())
    .sort((a, b) => Date.parse(a.dueAt!) - Date.parse(b.dueAt!));
}

/** Concepts answered at least once whose mastery is still below the bar, weakest first. */
export function needsRevision(states: ConceptState[]): ConceptState[] {
  return states.filter((s) => s.correct + s.incorrect > 0 && s.mastery < MASTERED).sort((a, b) => a.mastery - b.mastery);
}

const round = (n: number) => Math.round(n * 1000) / 1000;
