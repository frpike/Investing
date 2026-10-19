// A fake Trading 212 API serving fictional data, for end-to-end tests only.
import { readFileSync } from "node:fs";
import http from "node:http";

const fx = JSON.parse(readFileSync(new URL("../src/lib/__fixtures__/t212-api-fictional.json", import.meta.url), "utf8"));
http.createServer((req, res) => {
  const send = (body, status = 200) => { res.writeHead(status, { "content-type": "application/json" }); res.end(JSON.stringify(body)); };
  if (req.method !== "GET") return send({ error: "read-only mock" }, 405);
  const url = req.url ?? "";
  if (url === "/") return send({ ok: true });
  if (req.headers.authorization !== "e2e-key") return send({ error: "bad key" }, 401);
  if (url.startsWith("/api/v0/equity/account/summary")) return send(fx.summary);
  if (url.startsWith("/api/v0/equity/positions")) return send(fx.positions);
  if (url.startsWith("/api/v0/equity/history/transactions")) return send(fx.transactions[url.includes("cursor=") ? 1 : 0]);
  if (url.startsWith("/api/v0/equity/history/dividends")) return send(fx.dividends[0]);
  send({ error: "not found" }, 404);
}).listen(3199);
