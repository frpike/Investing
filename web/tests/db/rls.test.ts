// Data-isolation tests: run through PostgREST (the same API layer Supabase uses) with
// JWTs for two different users. Started by scripts/db-test.sh.
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { PostgrestClient } from "@supabase/postgrest-js";
import { SignJWT } from "jose";
import { beforeAll, describe, expect, it } from "vitest";

const DB_URL = process.env.RLS_DB_URL!;
const REST_URL = process.env.RLS_REST_URL!;
const SECRET = new TextEncoder().encode(process.env.RLS_JWT_SECRET!);

const sql = (q: string) => execFileSync("psql", [DB_URL, "-Atqc", q], { encoding: "utf8" }).trim();

async function clientFor(role: "anon" | "authenticated", sub?: string) {
  const token = await new SignJWT({ role, ...(sub ? { sub } : {}) })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("10m")
    .sign(SECRET);
  return new PostgrestClient(REST_URL, { headers: { Authorization: `Bearer ${token}` } });
}

const alice = randomUUID();
const bob = randomUUID();
let A: PostgrestClient, B: PostgrestClient, anon: PostgrestClient;
let alicePortfolio: string;

beforeAll(async () => {
  sql(`insert into auth.users (id, email) values ('${alice}', 'alice@example.test'), ('${bob}', 'bob@example.test')`);
  sql(`insert into public.course_modules (id, position, title, summary, content_version) values ('m-test', 99, 'Test module', 'Fictional test module', 't')`);
  A = await clientFor("authenticated", alice);
  B = await clientFor("authenticated", bob);
  anon = await clientFor("anon");
  const { data, error } = await A.from("portfolios").insert({ user_id: alice, kind: "manual", name: "Alice test" }).select().single();
  expect(error).toBeNull();
  alicePortfolio = data!.id;
  const h = await A.from("holdings").insert({
    user_id: alice, portfolio_id: alicePortfolio, name: "Fictional Fund", quantity: 2,
    instrument_currency: "GBP", source_id: "manual",
  });
  expect(h.error).toBeNull();
});

describe("row level security", () => {
  it("creates a profile for each new user", async () => {
    const { data } = await A.from("profiles").select("user_id");
    expect(data).toEqual([{ user_id: alice }]);
  });

  it("hides one user's portfolio and holdings from another", async () => {
    expect((await B.from("portfolios").select("*")).data).toEqual([]);
    expect((await B.from("holdings").select("*")).data).toEqual([]);
    expect((await A.from("holdings").select("name")).data).toEqual([{ name: "Fictional Fund" }]);
  });

  it("stops a user updating or deleting another user's rows", async () => {
    const upd = await B.from("portfolios").update({ name: "hacked" }).eq("id", alicePortfolio).select();
    expect(upd.data).toEqual([]);
    const del = await B.from("holdings").delete().eq("portfolio_id", alicePortfolio).select();
    expect(del.data).toEqual([]);
    expect(sql(`select name from public.portfolios where id = '${alicePortfolio}'`)).toBe("Alice test");
    expect(sql(`select count(*) from public.holdings where portfolio_id = '${alicePortfolio}'`)).toBe("1");
  });

  it("rejects rows written with someone else's user_id", async () => {
    const res = await B.from("portfolios").insert({ user_id: alice, kind: "manual", name: "spoof" });
    expect(res.error).not.toBeNull();
  });

  it("rejects a holding pointed at another user's portfolio", async () => {
    const res = await B.from("holdings").insert({
      user_id: bob, portfolio_id: alicePortfolio, name: "x", quantity: 1, instrument_currency: "GBP", source_id: "manual",
    });
    expect(res.error).not.toBeNull();
  });

  it("lets anyone read course content but not user data", async () => {
    expect((await anon.from("course_modules").select("id")).data).toContainEqual({ id: "m-test" });
    const p = await anon.from("portfolios").select("*");
    expect(p.data ?? []).toEqual([]);
  });

  it("never exposes broker credentials or lets clients create connections", async () => {
    const creds = await A.from("broker_credentials").select("*");
    expect(creds.error).not.toBeNull();
    const conn = await A.from("broker_connections").insert({ user_id: alice, broker: "trading212", environment: "demo", status: "active" });
    expect(conn.error).not.toBeNull();
  });

  it("only lets the server write usage counters", async () => {
    const res = await A.from("usage_counters").insert({ user_id: alice, feature: "tutor_message", window_start: new Date().toISOString(), count: 0 });
    expect(res.error).not.toBeNull();
  });

  it("keeps practice trades off real portfolios", async () => {
    const bad = await A.from("practice_trades").insert({
      user_id: alice, portfolio_id: alicePortfolio, scenario_id: "s1", scenario_kind: "hypothetical",
      side: "buy", instrument: "Fictional Co", quantity: 1, price: 10,
    });
    expect(bad.error?.message).toMatch(/practice portfolio/);
    const { data: practice } = await A.from("portfolios").insert({ user_id: alice, kind: "practice", name: "Practice" }).select().single();
    const ok = await A.from("practice_trades").insert({
      user_id: alice, portfolio_id: practice!.id, scenario_id: "s1", scenario_kind: "hypothetical",
      side: "buy", instrument: "Fictional Co", quantity: 1, price: 10,
    });
    expect(ok.error).toBeNull();
  });

  it("deletes everything when a user deletes their account", async () => {
    const res = await A.rpc("delete_my_account");
    expect(res.error).toBeNull();
    expect(sql(`select count(*) from auth.users where id = '${alice}'`)).toBe("0");
    expect(sql(`select count(*) from public.portfolios where user_id = '${alice}'`)).toBe("0");
    expect(sql(`select count(*) from public.holdings where user_id = '${alice}'`)).toBe("0");
    expect(sql(`select count(*) from public.profiles where user_id = '${alice}'`)).toBe("0");
    expect(sql(`select count(*) from auth.users where id = '${bob}'`)).toBe("1");
  });

  it("refuses account deletion for anonymous callers", async () => {
    const res = await anon.rpc("delete_my_account");
    expect(res.error).not.toBeNull();
  });
});

describe("usage limits", () => {
  it("counts uses up to the limit, then refuses, and only for the service role", async () => {
    const svc = await clientFor("authenticated", bob);
    const denied = await svc.rpc("take_usage", { p_user: bob, p_feature: "tutor_message", p_window: "2026-10-17T12:00:00Z", p_limit: 2 });
    expect(denied.error).not.toBeNull();
    const token = await new SignJWT({ role: "service_role" }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("10m").sign(SECRET);
    const service = new PostgrestClient(REST_URL, { headers: { Authorization: `Bearer ${token}` } });
    const args = { p_user: bob, p_feature: "tutor_message", p_window: "2026-10-17T12:00:00Z", p_limit: 2 };
    expect((await service.rpc("take_usage", args)).data).toBe(1);
    expect((await service.rpc("take_usage", args)).data).toBe(2);
    expect((await service.rpc("take_usage", args)).data).toBe(-1);
  });
});
