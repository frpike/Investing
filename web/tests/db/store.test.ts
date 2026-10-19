// Round-trips AppData through SupabaseStore against Postgres + PostgREST (run by scripts/db-test.sh).
import http from "node:http";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { SignJWT } from "jose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getLesson } from "@/content";
import { contentRows } from "@/lib/content-sync";
import { recordQuiz, setPrefs, upsertHolding, applyImport, applyBrokerSync } from "@/lib/store/actions";
import { SupabaseStore } from "@/lib/store/supabase-store";
import { emptyData } from "@/lib/store/types";
import { importTrading212Csv } from "@/lib/portfolio/import-trading212";
import { readFileSync } from "node:fs";

const REST = process.env.RLS_REST_URL!;
const SECRET = new TextEncoder().encode(process.env.RLS_JWT_SECRET!);
const DB_URL = process.env.RLS_DB_URL!;
const now = new Date("2026-10-17T12:00:00Z");
let server: http.Server;
const PROXY = "http://localhost:3902";

const jwt = (role: string, sub?: string) =>
  new SignJWT({ role, ...(sub ? { sub } : {}) }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("10m").sign(SECRET);
const client = async (role: string, sub?: string) => {
  const token = await jwt(role, sub);
  return createClient(PROXY, "anon-key-not-used", { accessToken: async () => token });
};

beforeAll(async () => {
  // Supabase serves PostgREST under /rest/v1; strip that prefix so supabase-js can talk to plain PostgREST.
  server = http.createServer((req, res) => {
    const target = new URL(REST);
    const up = http.request({ host: target.hostname, port: target.port, path: req.url!.replace(/^\/rest\/v1/, ""), method: req.method, headers: req.headers }, (r) => {
      res.writeHead(r.statusCode!, r.headers); r.pipe(res);
    });
    req.pipe(up);
  }).listen(3902);
  const service = await client("service_role");
  const { modules, lessons, questions } = contentRows();
  for (const [t, rows] of [["course_modules", modules], ["lessons", lessons], ["quiz_questions", questions]] as const) {
    const { error } = await service.from(t).upsert(rows as Record<string, unknown>[]);
    expect(error, t).toBeNull();
  }
});
afterAll(() => server?.close());

describe("SupabaseStore", () => {
  it("syncs course content with the service role", () => {
    expect(execFileSync("psql", [DB_URL, "-Atqc", "select count(*) from public.lessons"], { encoding: "utf8" }).trim()).toBe("7");
  });

  it("saves and reloads preferences, quiz progress, mastery and portfolio", async () => {
    const uid = randomUUID();
    execFileSync("psql", [DB_URL, "-qc", `insert into auth.users (id) values ('${uid}')`]);
    const store = new SupabaseStore(await client("authenticated", uid), uid);

    let data = await store.load();
    expect(data).toEqual(emptyData());

    let prev = data; let change;
    [data, change] = setPrefs(data, { experience: "none", focus: "both", goals: ["house"], numeracyConfidence: 3 }, now, "Sam");
    await store.save(data, change, prev);

    const quiz = getLesson("compound-growth")!.lesson.quiz;
    const answers = Object.fromEntries(quiz.map((q) => [q.id, q.correctOptionId]));
    prev = data;
    [data, change] = recordQuiz(data, { lessonId: "compound-growth", context: "lesson", questions: quiz, answers, confidence: 4 }, now, randomUUID());
    await store.save(data, change, prev);

    prev = data;
    [data, change] = upsertHolding(data, {
      id: randomUUID(), name: "Fictional Fund", ticker: "FAKEW", isin: null, assetType: "etf", sector: null, region: null, quantity: 3,
      instrumentCurrency: "GBP", avgPrice: null, costBasisBase: 300, lastPrice: 105, lastPriceAt: now.toISOString(), lastPriceSource: "user_price", fxRateToBase: null, source: "manual",
    }, randomUUID(), now);
    await store.save(data, change, prev);

    const csv = readFileSync(new URL("../../src/lib/__fixtures__/trading212-fictional.csv", import.meta.url), "utf8");
    const parsed = importTrading212Csv(csv);
    prev = data;
    [data, change] = applyImport(data, parsed, { id: randomUUID(), source: "csv_trading212", fileName: "fictional.csv", fileSha256: null, at: now.toISOString(), rowsTotal: parsed.rowsTotal, rowsImported: parsed.rowsImported, rowsRejected: parsed.errors.length, errors: parsed.errors }, data.portfolio!.id, randomUUID, now);
    await store.save(data, change, prev);

    const reloaded = await store.load();
    expect(reloaded.profile.displayName).toBe("Sam");
    expect(reloaded.prefs?.goals).toEqual(["house"]);
    expect(reloaded.onboardedAt).not.toBeNull();
    expect(reloaded.lessonProgress["compound-growth"].status).toBe("completed");
    expect(reloaded.attempts).toHaveLength(1);
    expect(reloaded.concepts["compound-growth"].mastery).toBeCloseTo(data.concepts["compound-growth"].mastery);
    expect(reloaded.activityDays).toEqual(["2026-10-17"]);
    expect(reloaded.portfolio!.holdings).toHaveLength(3);
    expect(reloaded.portfolio!.holdings.find((h) => h.ticker === "FAKEW")!.lastPrice).toBe(105);
    expect(reloaded.portfolio!.transactions).toHaveLength(parsed.rowsImported);
    expect(reloaded.imports[0].rowsRejected).toBe(1);

    // Re-importing the same file adds no duplicate transactions.
    prev = reloaded;
    const [again, ch2] = applyImport(reloaded, parsed, { id: randomUUID(), source: "csv_trading212", fileName: "fictional.csv", fileSha256: null, at: now.toISOString(), rowsTotal: 0, rowsImported: 0, rowsRejected: 0, errors: [] }, reloaded.portfolio!.id, randomUUID, now);
    await store.save(again, ch2, prev);
    expect((await store.load()).portfolio!.transactions).toHaveLength(parsed.rowsImported);

    // A Trading 212 sync (fictional, already normalised) saves holdings and a snapshot.
    const synced = await store.load();
    const [afterSync, ch3] = applyBrokerSync(synced, {
      holdings: [{ id: "x", name: "Fictional Synced Fund", ticker: "SYNC", isin: null, assetType: null, sector: null, region: null, quantity: 2,
        instrumentCurrency: "GBP", avgPrice: 50, costBasisBase: 100, lastPrice: 55, lastPriceAt: now.toISOString(), lastPriceSource: "api_trading212", fxRateToBase: null, source: "api_trading212" }],
      transactions: [],
      snapshot: { takenAt: now.toISOString(), source: "api_trading212", environment: "demo", totalValue: 500, invested: 400, cash: 12.5, historyComplete: true },
    }, synced.portfolio!.id, randomUUID, now);
    await store.save(afterSync, ch3, synced);
    const withSync = await store.load();
    expect(withSync.snapshots).toEqual([expect.objectContaining({ totalValue: 500, invested: 400, cash: 12.5, environment: "demo", historyComplete: true })]);
    expect(withSync.portfolio!.holdings.find((h) => h.ticker === "SYNC")!.lastPriceSource).toBe("api_trading212");

    // Deleting the account removes everything.
    await store.deleteAll();
    expect(execFileSync("psql", [DB_URL, "-Atqc", `select count(*) from public.quiz_attempts where user_id = '${uid}'`], { encoding: "utf8" }).trim()).toBe("0");
  });
});
