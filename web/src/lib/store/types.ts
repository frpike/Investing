import type { ConceptState, LearningPreferences, LessonProgress, QuizAttempt } from "@/lib/learning/types";
import type { Portfolio } from "@/lib/portfolio/types";

export interface ImportLogEntry {
  id: string;
  source: "csv_trading212";
  fileName: string;
  fileSha256: string | null;
  at: string;
  rowsTotal: number;
  rowsImported: number;
  rowsRejected: number;
  errors: { row: number; message: string }[];
}

export interface SnapshotEntry {
  id: string;
  takenAt: string;
  source: "api_trading212";
  environment: "live" | "demo";
  totalValue: number | null;
  invested: number | null;
  cash: number | null;
  historyComplete: boolean;
}

export interface AppData {
  version: 1;
  profile: { displayName: string | null };
  prefs: LearningPreferences | null;
  onboardedAt: string | null;
  diagnostic: { answers: Record<string, string>; scoreByConcept: Record<string, number>; takenAt: string } | null;
  lessonProgress: Record<string, LessonProgress>;
  /** Oldest first. */
  attempts: QuizAttempt[];
  concepts: Record<string, ConceptState>;
  /** The learner's manual / imported portfolio. Practice portfolios are kept separately (Phase 3). */
  portfolio: Portfolio | null;
  imports: ImportLogEntry[];
  /** Point-in-time account values from Trading 212 syncs, oldest first. */
  snapshots: SnapshotEntry[];
  tutorTopics: Record<string, number>;
  /** YYYY-MM-DD, sorted, unique. */
  activityDays: string[];
}

export type Change =
  | { type: "profile" }
  | { type: "prefs" }
  | { type: "diagnostic" }
  | { type: "quiz"; attempt: QuizAttempt; conceptIds: string[]; lessonId: string | null }
  | { type: "lessonStarted"; lessonId: string }
  | { type: "portfolio" }
  | { type: "import"; entry: ImportLogEntry }
  | { type: "brokerSync"; snapshot: SnapshotEntry }
  | { type: "activity" }
  | { type: "tutorTopics" };

/** Persistence for AppData. State transitions live in actions.ts; stores only save them. */
export interface Store {
  readonly kind: "guest" | "account";
  load(): Promise<AppData>;
  save(next: AppData, change: Change, prev: AppData): Promise<void>;
  exportAll(): Promise<unknown>;
  /** Guest: clears this browser. Account: deletes the account and every row (cascade). */
  deleteAll(): Promise<void>;
}

export const emptyData = (): AppData => ({
  version: 1,
  profile: { displayName: null },
  prefs: null,
  onboardedAt: null,
  diagnostic: null,
  lessonProgress: {},
  attempts: [],
  concepts: {},
  portfolio: null,
  imports: [],
  snapshots: [],
  tutorTopics: {},
  activityDays: [],
});
