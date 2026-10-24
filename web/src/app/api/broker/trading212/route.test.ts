import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";

const fx = JSON.parse(readFileSync(new URL("../../../../lib/__fixtures__/t212-api-fictional.json", import.meta.url), "utf8"));
const req = (code?: string, ip = "1.2.3.4") =>
  new Request("http://app.test/api/broker/trading212", { method: "POST", headers: { ...(code ? { "x-access-code": code } : {}), "x-forwarded-for": ip } });

async function loadRoute(env: Record<string, string>) {
  vi.resetModules();
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  return import("./route");
}

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("Trading 212 personal-mode route", () => {
  it("reports disabled and refuses to sync when not configured", async () => {
    const route = await loadRoute({ T212_API_KEY: "", T212_ACCESS_CODE: "" });
    expect(await (await route.GET()).json()).toMatchObject({ enabled: false, environment: null });
    expect((await route.POST(req("anything") as never)).status).toBe(404);
  });

  it("needs the right access code, never leaks the key, and locks out repeated guesses", async () => {
    const route = await loadRoute({ T212_API_KEY: "secret-key", T212_ACCESS_CODE: "correct-horse", T212_ENV: "demo" });
    const status = await (await route.GET()).text();
    expect(status).not.toContain("secret-key");
    expect(JSON.parse(status)).toMatchObject({ enabled: true, environment: "demo" });
    expect((await route.POST(req(undefined, "9.9.9.9") as never)).status).toBe(401);
    for (let i = 0; i < 5; i++) expect((await route.POST(req("wrong", "5.5.5.5") as never)).status).toBe(401);
    expect((await route.POST(req("correct-horse", "5.5.5.5") as never)).status).toBe(429);
  });

  it("returns a snapshot with the right code and caches it briefly", async () => {
    const route = await loadRoute({ T212_API_KEY: "k", T212_ACCESS_CODE: "correct-horse", T212_BASE_URL: "https://t212.test" });
    let tx = 0;
    const fetchMock = vi.fn(async (url: string) => {
      const p = url.replace("https://t212.test", "");
      if (p.startsWith("/api/v0/equity/account/summary")) return Response.json(fx.summary);
      if (p.startsWith("/api/v0/equity/positions")) return Response.json(fx.positions);
      if (p.includes("transactions")) return Response.json(fx.transactions[tx++ % 2]);
      return Response.json(fx.dividends[0]);
    });
    vi.stubGlobal("fetch", fetchMock);
    const first = await route.POST(req("correct-horse") as never);
    expect(first.status).toBe(200);
    const body = await first.json();
    expect(body.snapshot.holdings).toHaveLength(2);
    expect(JSON.stringify(body)).not.toContain("correct-horse");
    const calls = fetchMock.mock.calls.length;
    expect((await (await route.POST(req("correct-horse") as never)).json()).cached).toBe(true);
    expect(fetchMock.mock.calls.length).toBe(calls);
  });
});

describe("owner-only lock", () => {
  it("refuses to sync unless the signed-in user is the owner", async () => {
    vi.doMock("@/lib/supabase/server", () => ({
      getServerSupabase: async () => ({ auth: { getUser: async () => ({ data: { user: { email: "someone.else@example.test" } } }) } }),
    }));
    const route = await loadRoute({ T212_API_KEY: "k", T212_ACCESS_CODE: "correct-horse", OWNER_EMAIL: "Owner@Example.test" });
    const res = await route.POST(req("correct-horse", "7.7.7.7") as never);
    expect(res.status).toBe(403);
    expect((await res.json()).error).toMatch(/owner's account/);
    vi.doUnmock("@/lib/supabase/server");
  });

  it("allows the owner (email compared without case)", async () => {
    vi.doMock("@/lib/supabase/server", () => ({
      getServerSupabase: async () => ({ auth: { getUser: async () => ({ data: { user: { email: "owner@example.test" } } }) } }),
    }));
    const route = await loadRoute({ T212_API_KEY: "k", T212_ACCESS_CODE: "correct-horse", OWNER_EMAIL: "Owner@Example.test", T212_BASE_URL: "https://t212.test" });
    let tx = 0;
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      const p = url.replace("https://t212.test", "");
      if (p.startsWith("/api/v0/equity/account/summary")) return Response.json(fx.summary);
      if (p.startsWith("/api/v0/equity/positions")) return Response.json(fx.positions);
      if (p.includes("transactions")) return Response.json(fx.transactions[tx++ % 2]);
      return Response.json(fx.dividends[0]);
    }));
    expect((await route.POST(req("correct-horse", "8.8.8.8") as never)).status).toBe(200);
    vi.doUnmock("@/lib/supabase/server");
  });
});
