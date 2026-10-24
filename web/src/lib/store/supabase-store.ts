import type { SupabaseClient } from "@supabase/supabase-js";
import type { ConceptState, LearningPreferences, QuizAttempt } from "@/lib/learning/types";
import type { Holding, Portfolio, Transaction } from "@/lib/portfolio/types";
import { emptyData, type AppData, type Change, type Store } from "./types";

// Account mode: AppData mapped onto the Postgres tables (see supabase/migrations). Every query
// runs as the signed-in user, so RLS limits it to their own rows; user_id is still sent
// explicitly because the insert policies check it.

type Row = Record<string, unknown>;
const must = <T>(res: { data: T; error: { message: string } | null }): T => {
  if (res.error) throw new Error(res.error.message);
  return res.data;
};

const prefsToRow = (p: LearningPreferences, userId: string, onboardedAt: string | null): Row => ({
  user_id: userId,
  experience: p.experience ?? null,
  goals: p.goals ?? [],
  horizon: p.horizon ?? null,
  regular_amount_gbp: p.regularAmountGbp ?? null,
  regular_frequency: p.regularFrequency ?? null,
  has_trading212: p.hasTrading212 ?? null,
  focus: p.focus ?? null,
  numeracy_confidence: p.numeracyConfidence ?? null,
  skipped: p.skipped ?? [],
  onboarded_at: onboardedAt,
});

const rowToPrefs = (r: Row): LearningPreferences => ({
  experience: (r.experience as LearningPreferences["experience"]) ?? undefined,
  goals: (r.goals as string[]) ?? [],
  horizon: (r.horizon as LearningPreferences["horizon"]) ?? undefined,
  regularAmountGbp: r.regular_amount_gbp == null ? null : Number(r.regular_amount_gbp),
  regularFrequency: (r.regular_frequency as LearningPreferences["regularFrequency"]) ?? undefined,
  hasTrading212: (r.has_trading212 as LearningPreferences["hasTrading212"]) ?? undefined,
  focus: (r.focus as LearningPreferences["focus"]) ?? undefined,
  numeracyConfidence: (r.numeracy_confidence as LearningPreferences["numeracyConfidence"]) ?? undefined,
  skipped: (r.skipped as string[]) ?? [],
});

const conceptToRow = (c: ConceptState, userId: string): Row => ({
  user_id: userId, concept_id: c.conceptId, mastery: c.mastery, correct_count: c.correct, incorrect_count: c.incorrect,
  interval_days: c.intervalDays, ease: c.ease, due_at: c.dueAt, last_seen_at: c.lastSeenAt,
});
const rowToConcept = (r: Row): ConceptState => ({
  conceptId: r.concept_id as string, mastery: Number(r.mastery), correct: Number(r.correct_count), incorrect: Number(r.incorrect_count),
  intervalDays: Number(r.interval_days), ease: Number(r.ease), dueAt: (r.due_at as string) ?? null, lastSeenAt: (r.last_seen_at as string) ?? null,
});

const holdingToRow = (h: Holding, userId: string, portfolioId: string): Row => ({
  id: h.id, user_id: userId, portfolio_id: portfolioId, ticker: h.ticker, isin: h.isin, name: h.name, asset_type: h.assetType,
  sector: h.sector, region: h.region, quantity: h.quantity, instrument_currency: h.instrumentCurrency, avg_price: h.avgPrice,
  cost_basis_base: h.costBasisBase, last_price: h.lastPrice, last_price_at: h.lastPriceAt, last_price_source: h.lastPriceSource,
  fx_rate_to_base: h.fxRateToBase, source_id: h.source,
});
const num = (v: unknown) => (v == null ? null : Number(v));
const rowToHolding = (r: Row): Holding => ({
  id: r.id as string, name: r.name as string, ticker: (r.ticker as string) ?? null, isin: (r.isin as string) ?? null,
  assetType: (r.asset_type as Holding["assetType"]) ?? null, sector: (r.sector as string) ?? null, region: (r.region as string) ?? null,
  quantity: Number(r.quantity), instrumentCurrency: r.instrument_currency as string, avgPrice: num(r.avg_price),
  costBasisBase: num(r.cost_basis_base), lastPrice: num(r.last_price), lastPriceAt: (r.last_price_at as string) ?? null,
  lastPriceSource: (r.last_price_source as Holding["lastPriceSource"]) ?? null, fxRateToBase: num(r.fx_rate_to_base),
  source: r.source_id as Holding["source"],
});
const txToRow = (t: Transaction, userId: string, portfolioId: string): Row => ({
  id: t.id, user_id: userId, portfolio_id: portfolioId, kind: t.kind, occurred_at: t.occurredAt, ticker: t.ticker, isin: t.isin,
  name: t.name, quantity: t.quantity, price: t.price, price_currency: t.priceCurrency, total_base: t.totalBase,
  base_currency: t.baseCurrency, withholding_tax: t.withholdingTax, external_ref: t.externalRef, source_id: t.source,
});
const rowToTx = (r: Row): Transaction => ({
  id: r.id as string, kind: r.kind as Transaction["kind"], occurredAt: r.occurred_at as string, ticker: (r.ticker as string) ?? null,
  isin: (r.isin as string) ?? null, name: (r.name as string) ?? null, quantity: num(r.quantity), price: num(r.price),
  priceCurrency: (r.price_currency as string)?.trim() ?? null, totalBase: num(r.total_base), baseCurrency: (r.base_currency as string)?.trim() ?? null,
  withholdingTax: num(r.withholding_tax), externalRef: (r.external_ref as string) ?? null, source: r.source_id as Transaction["source"],
});

export class SupabaseStore implements Store {
  readonly kind = "account" as const;
  constructor(private db: SupabaseClient, private userId: string) {}

  async load(): Promise<AppData> {
    const uid = this.userId;
    const [profile, prefs, diag, progress, attempts, concepts, portfolios, imports, snaps] = await Promise.all([
      this.db.from("profiles").select("display_name, tutor_topics, activity_days").eq("user_id", uid).maybeSingle(),
      this.db.from("learning_preferences").select("*").eq("user_id", uid).maybeSingle(),
      this.db.from("diagnostic_results").select("*").eq("user_id", uid).order("taken_at", { ascending: false }).limit(1).maybeSingle(),
      this.db.from("lesson_progress").select("*").eq("user_id", uid),
      this.db.from("quiz_attempts").select("*").eq("user_id", uid).order("created_at", { ascending: false }).limit(500),
      this.db.from("concept_mastery").select("*").eq("user_id", uid),
      this.db.from("portfolios").select("*").eq("user_id", uid).eq("kind", "manual").order("created_at").limit(1),
      this.db.from("import_jobs").select("*").eq("user_id", uid).order("created_at").limit(100),
      this.db.from("portfolio_snapshots").select("*").eq("user_id", uid).order("taken_at", { ascending: false }).limit(1000),
    ]);
    const data = emptyData();
    const p = must(profile) as Row | null;
    if (p) {
      data.profile = { displayName: (p.display_name as string) ?? null };
      data.tutorTopics = (p.tutor_topics as Record<string, number>) ?? {};
      data.activityDays = ((p.activity_days as string[]) ?? []).slice().sort();
    }
    const pr = must(prefs) as Row | null;
    if (pr) { data.prefs = rowToPrefs(pr); data.onboardedAt = (pr.onboarded_at as string) ?? null; }
    const d = must(diag) as Row | null;
    if (d) data.diagnostic = { answers: d.answers as Record<string, string>, scoreByConcept: d.score_by_concept as Record<string, number>, takenAt: d.taken_at as string };
    for (const r of must(progress) as Row[]) data.lessonProgress[r.lesson_id as string] = { lessonId: r.lesson_id as string, status: r.status as "started" | "completed", completedAt: (r.completed_at as string) ?? null };
    data.attempts = (must(attempts) as Row[]).reverse().map((r): QuizAttempt => ({
      id: r.id as string, lessonId: (r.lesson_id as string) ?? null, context: r.context as QuizAttempt["context"],
      answers: r.answers as Record<string, string>, score: Number(r.score), confidence: (r.confidence as number) ?? null, createdAt: r.created_at as string,
    }));
    for (const r of must(concepts) as Row[]) data.concepts[r.concept_id as string] = rowToConcept(r);
    const port = (must(portfolios) as Row[])[0];
    if (port) {
      const [h, t] = await Promise.all([
        this.db.from("holdings").select("*").eq("portfolio_id", port.id as string).order("created_at"),
        this.db.from("transactions").select("*").eq("portfolio_id", port.id as string).order("occurred_at").limit(5000),
      ]);
      data.portfolio = {
        id: port.id as string, name: port.name as string, kind: "manual", baseCurrency: port.base_currency as string,
        holdings: (must(h) as Row[]).map(rowToHolding), transactions: (must(t) as Row[]).map(rowToTx), updatedAt: port.updated_at as string,
      };
    }
    data.imports = (must(imports) as Row[]).map((r) => ({
      id: r.id as string, source: "csv_trading212", fileName: (r.file_name as string) ?? "", fileSha256: (r.file_sha256 as string) ?? null,
      at: r.created_at as string, rowsTotal: Number(r.rows_total), rowsImported: Number(r.rows_imported), rowsRejected: Number(r.rows_rejected),
      errors: (r.errors as { row: number; message: string }[]) ?? [],
    }));
    data.snapshots = (must(snaps) as Row[]).reverse().map((r) => {
      const d = (r.detail as Record<string, unknown>) ?? {};
      return {
        id: r.id as string, takenAt: r.taken_at as string, source: "api_trading212" as const,
        environment: (d.environment as "live" | "demo") ?? "live", totalValue: num(r.total_value_base), invested: num(r.invested_base),
        cash: num(d.cash), historyComplete: Boolean(d.historyComplete),
        holdings: Array.isArray(d.holdings) ? (d.holdings as { key: string; name: string; value: number | null }[]) : undefined,
      };
    });
    return data;
  }

  async save(next: AppData, change: Change, prev: AppData): Promise<void> {
    const uid = this.userId;
    switch (change.type) {
      case "profile":
      case "prefs":
        must(await this.db.from("profiles").update({ display_name: next.profile.displayName }).eq("user_id", uid));
        if (next.prefs) must(await this.db.from("learning_preferences").upsert(prefsToRow(next.prefs, uid, next.onboardedAt)));
        return;
      case "diagnostic":
        if (next.diagnostic) must(await this.db.from("diagnostic_results").insert({ user_id: uid, answers: next.diagnostic.answers, score_by_concept: next.diagnostic.scoreByConcept, taken_at: next.diagnostic.takenAt }));
        return this.saveActivity(next, prev);
      case "quiz": {
        const a = change.attempt;
        must(await this.db.from("quiz_attempts").insert({ id: a.id, user_id: uid, lesson_id: a.lessonId, context: a.context, answers: a.answers, score: a.score, confidence: a.confidence, created_at: a.createdAt }));
        const rows = change.conceptIds.map((c) => next.concepts[c]).filter(Boolean).map((c) => conceptToRow(c, uid));
        if (rows.length) must(await this.db.from("concept_mastery").upsert(rows));
        if (change.lessonId && next.lessonProgress[change.lessonId]) await this.saveLesson(change.lessonId, next);
        return this.saveActivity(next, prev);
      }
      case "lessonStarted":
        return this.saveLesson(change.lessonId, next);
      case "brokerSync": {
        await this.savePortfolio(next.portfolio, prev.portfolio);
        const s = change.snapshot;
        must(await this.db.from("portfolio_snapshots").insert({
          id: s.id, user_id: uid, portfolio_id: next.portfolio!.id, taken_at: s.takenAt, total_value_base: s.totalValue,
          invested_base: s.invested, source_id: "api_trading212", detail: { environment: s.environment, cash: s.cash, historyComplete: s.historyComplete, holdings: s.holdings ?? [] },
        }));
        return;
      }
      case "portfolio":
      case "import":
        await this.savePortfolio(next.portfolio, prev.portfolio);
        if (change.type === "import") {
          const e = change.entry;
          must(await this.db.from("import_jobs").insert({
            id: e.id, user_id: uid, portfolio_id: next.portfolio!.id, source_id: e.source, file_name: e.fileName.slice(0, 200),
            file_sha256: e.fileSha256, status: "committed", rows_total: e.rowsTotal, rows_imported: e.rowsImported,
            rows_rejected: e.rowsRejected, errors: e.errors.slice(0, 200),
          }));
        }
        return;
      case "tutorTopics":
        must(await this.db.from("profiles").update({ tutor_topics: next.tutorTopics }).eq("user_id", uid));
        return this.saveActivity(next, prev);
      case "activity":
        return this.saveActivity(next, prev);
    }
  }

  private async saveLesson(lessonId: string, next: AppData) {
    const lp = next.lessonProgress[lessonId];
    must(await this.db.from("lesson_progress").upsert({ user_id: this.userId, lesson_id: lessonId, status: lp.status, completed_at: lp.completedAt }));
  }

  private async saveActivity(next: AppData, prev: AppData) {
    if (next.activityDays.length === prev.activityDays.length) return;
    must(await this.db.from("profiles").update({ activity_days: next.activityDays }).eq("user_id", this.userId));
  }

  private async savePortfolio(next: Portfolio | null, prev: Portfolio | null) {
    if (!next) return;
    const uid = this.userId;
    if (!prev) must(await this.db.from("portfolios").upsert({ id: next.id, user_id: uid, kind: "manual", name: next.name, base_currency: next.baseCurrency }));
    const removed = (prev?.holdings ?? []).filter((h) => !next.holdings.some((n) => n.id === h.id)).map((h) => h.id);
    if (removed.length) must(await this.db.from("holdings").delete().in("id", removed));
    const changed = next.holdings.filter((h) => JSON.stringify(h) !== JSON.stringify(prev?.holdings.find((p) => p.id === h.id)));
    if (changed.length) must(await this.db.from("holdings").upsert(changed.map((h) => holdingToRow(h, uid, next.id))));
    const prevTx = new Set((prev?.transactions ?? []).map((t) => t.id));
    const newTx = next.transactions.filter((t) => !prevTx.has(t.id));
    for (let i = 0; i < newTx.length; i += 500) {
      must(await this.db.from("transactions").insert(newTx.slice(i, i + 500).map((t) => txToRow(t, uid, next.id))));
    }
  }

  async exportAll() {
    return { exportedAt: new Date().toISOString(), mode: "account", data: await this.load() };
  }

  async deleteAll() {
    must(await this.db.rpc("delete_my_account"));
  }
}
