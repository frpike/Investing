export type AttemptContext = "lesson" | "diagnostic" | "review";

export interface ConceptState {
  conceptId: string;
  /** 0–1 estimate of understanding, from answers only (never from streaks or time spent). */
  mastery: number;
  correct: number;
  incorrect: number;
  intervalDays: number;
  ease: number;
  dueAt: string | null;
  lastSeenAt: string | null;
}

export interface QuizAttempt {
  id: string;
  lessonId: string | null;
  context: AttemptContext;
  /** question id → chosen option id */
  answers: Record<string, string>;
  score: number;
  /** Self-rated confidence before seeing results, 1–5. */
  confidence: number | null;
  createdAt: string;
}

export interface LearningPreferences {
  experience?: "none" | "a_little" | "some" | "confident";
  goals?: string[];
  horizon?: "under_2y" | "2_5y" | "5_10y" | "over_10y" | "unsure";
  regularAmountGbp?: number | null;
  regularFrequency?: "daily" | "weekly" | "monthly" | "none";
  hasTrading212?: "yes" | "no" | "planning";
  focus?: "long_term" | "companies" | "both";
  numeracyConfidence?: 1 | 2 | 3 | 4 | 5;
  skipped?: string[];
}

export interface LessonProgress {
  lessonId: string;
  status: "started" | "completed";
  completedAt: string | null;
}
