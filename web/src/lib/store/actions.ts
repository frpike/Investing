import type { Question } from "@/content/schema";
import { applyAnswer, emptyConcept } from "@/lib/learning/mastery";
import { scoreByConcept, scoreQuiz, type QuizScore } from "@/lib/learning/scoring";
import type { AttemptContext, LearningPreferences } from "@/lib/learning/types";
import type { Holding, Portfolio } from "@/lib/portfolio/types";
import type { AppData, Change, ImportLogEntry } from "./types";

// Pure state transitions. Each returns the next AppData plus a Change describing what moved,
// which stores use to save only what changed.

export const PASS_MARK = 2 / 3;
const MAX_ATTEMPTS = 500;
const day = (d: Date) => d.toISOString().slice(0, 10);

export function withActivity(data: AppData, now: Date): AppData {
  const d = day(now);
  if (data.activityDays.includes(d)) return data;
  return { ...data, activityDays: [...data.activityDays, d].sort().slice(-400) };
}

/** Consecutive days with activity, ending today or yesterday. Shown for habit, never as competence. */
export function streak(days: string[], now: Date): number {
  const set = new Set(days);
  const cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (!set.has(day(cursor))) cursor.setUTCDate(cursor.getUTCDate() - 1);
  let n = 0;
  while (set.has(day(cursor))) { n++; cursor.setUTCDate(cursor.getUTCDate() - 1); }
  return n;
}

export function setPrefs(data: AppData, prefs: LearningPreferences, now: Date, displayName?: string | null): [AppData, Change] {
  return [{
    ...data,
    prefs,
    onboardedAt: data.onboardedAt ?? now.toISOString(),
    profile: displayName !== undefined ? { displayName } : data.profile,
  }, { type: "prefs" }];
}

export function recordDiagnostic(data: AppData, questions: Question[], answers: Record<string, string>, now: Date): [AppData, Change, QuizScore] {
  const score = scoreQuiz(questions, answers);
  const next: AppData = withActivity({
    ...data,
    diagnostic: { answers, scoreByConcept: scoreByConcept(score), takenAt: now.toISOString() },
  }, now);
  return [next, { type: "diagnostic" }, score];
}

export function recordQuiz(
  data: AppData,
  args: { lessonId: string | null; context: AttemptContext; questions: Question[]; answers: Record<string, string>; confidence: number | null },
  now: Date,
  id: string,
): [AppData, Change, QuizScore] {
  const score = scoreQuiz(args.questions, args.answers);
  const concepts = { ...data.concepts };
  for (const r of score.results) concepts[r.conceptId] = applyAnswer(concepts[r.conceptId] ?? emptyConcept(r.conceptId), r.correct, now);
  const attempt = {
    id, lessonId: args.lessonId, context: args.context, answers: args.answers, score: score.score,
    confidence: args.confidence, createdAt: now.toISOString(),
  };
  const lessonProgress = { ...data.lessonProgress };
  if (args.lessonId && args.context === "lesson") {
    const already = lessonProgress[args.lessonId]?.status === "completed";
    lessonProgress[args.lessonId] = already || score.score >= PASS_MARK
      ? { lessonId: args.lessonId, status: "completed", completedAt: lessonProgress[args.lessonId]?.completedAt ?? now.toISOString() }
      : { lessonId: args.lessonId, status: "started", completedAt: null };
  }
  const next = withActivity({ ...data, concepts, lessonProgress, attempts: [...data.attempts, attempt].slice(-MAX_ATTEMPTS) }, now);
  return [next, { type: "quiz", attempt, conceptIds: [...new Set(score.results.map((r) => r.conceptId))], lessonId: args.lessonId }, score];
}

export function startLesson(data: AppData, lessonId: string): [AppData, Change] | null {
  if (data.lessonProgress[lessonId]) return null;
  return [{ ...data, lessonProgress: { ...data.lessonProgress, [lessonId]: { lessonId, status: "started", completedAt: null } } }, { type: "lessonStarted", lessonId }];
}

export function ensurePortfolio(data: AppData, id: string, now: Date): Portfolio {
  return data.portfolio ?? { id, name: "My portfolio", kind: "manual", baseCurrency: "GBP", holdings: [], transactions: [], updatedAt: now.toISOString() };
}

export function upsertHolding(data: AppData, holding: Holding, portfolioId: string, now: Date): [AppData, Change] {
  const p = ensurePortfolio(data, portfolioId, now);
  const holdings = p.holdings.some((h) => h.id === holding.id)
    ? p.holdings.map((h) => (h.id === holding.id ? holding : h))
    : [...p.holdings, holding];
  return [{ ...data, portfolio: { ...p, holdings, updatedAt: now.toISOString() } }, { type: "portfolio" }];
}

export function removeHolding(data: AppData, holdingId: string, now: Date): [AppData, Change] {
  if (!data.portfolio) return [data, { type: "portfolio" }];
  return [{ ...data, portfolio: { ...data.portfolio, holdings: data.portfolio.holdings.filter((h) => h.id !== holdingId), updatedAt: now.toISOString() } }, { type: "portfolio" }];
}

/**
 * Applies a parsed import. Holdings from the file replace earlier holdings from the same source
 * with the same ISIN/ticker; prices the learner typed in are kept. Transactions are de-duplicated
 * by their reference so re-importing the same file is harmless.
 */
export function applyImport(
  data: AppData,
  parsed: { holdings: Holding[]; transactions: Portfolio["transactions"] },
  entry: ImportLogEntry,
  portfolioId: string,
  newId: () => string,
  now: Date,
): [AppData, Change] {
  const p = ensurePortfolio(data, portfolioId, now);
  const keyOf = (h: Pick<Holding, "isin" | "ticker" | "name">) => (h.isin ?? h.ticker ?? h.name).toUpperCase();
  const existing = new Map(p.holdings.map((h) => [keyOf(h), h]));
  const imported = parsed.holdings.map((h) => {
    const prev = existing.get(keyOf(h));
    return {
      ...h,
      id: prev?.id ?? newId(),
      lastPrice: prev?.lastPrice ?? null, lastPriceAt: prev?.lastPriceAt ?? null, lastPriceSource: prev?.lastPriceSource ?? null,
      fxRateToBase: prev?.fxRateToBase ?? null,
      assetType: prev?.assetType ?? h.assetType, sector: prev?.sector ?? h.sector, region: prev?.region ?? h.region,
    };
  });
  const importedKeys = new Set(imported.map(keyOf));
  const kept = p.holdings.filter((h) => !(h.source === "csv_trading212" && !importedKeys.has(keyOf(h))) && !importedKeys.has(keyOf(h)));
  const refs = new Set(p.transactions.map((t) => t.externalRef).filter(Boolean));
  const newTx = parsed.transactions.filter((t) => !t.externalRef || !refs.has(t.externalRef)).map((t) => ({ ...t, id: newId() }));
  return [{
    ...data,
    portfolio: { ...p, holdings: [...kept, ...imported], transactions: [...p.transactions, ...newTx], updatedAt: now.toISOString() },
    imports: [...data.imports, entry],
  }, { type: "import", entry }];
}

export function noteTutorTopics(data: AppData, conceptIds: string[], now: Date): [AppData, Change] | null {
  if (!conceptIds.length) return null;
  const tutorTopics = { ...data.tutorTopics };
  for (const c of conceptIds) tutorTopics[c] = (tutorTopics[c] ?? 0) + 1;
  return [withActivity({ ...data, tutorTopics }, now), { type: "tutorTopics" }];
}
