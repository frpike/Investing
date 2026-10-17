#!/usr/bin/env python3
"""Read a Trading 212 Invest account and write data/portfolio.json.

Uses only read endpoints. Needs a Trading 212 API key with these scopes:
account, portfolio, history:dividends, history:transactions. Never give the
key the orders scope.

Environment:
  T212_API_KEY     required
  T212_API_SECRET  optional (newer keys come as key + secret; older keys have no secret)
  T212_ENV         "live" (default) or "demo"

Usage: python3 sync/t212_sync.py [output path, default data/portfolio.json]
"""
import base64
import datetime as dt
import json
import os
import sys
import time
import urllib.error
import urllib.request

API_VERSION = "/api/v0"


def auth_header():
    key = os.environ.get("T212_API_KEY", "").strip()
    secret = os.environ.get("T212_API_SECRET", "").strip()
    if not key:
        sys.exit("T212_API_KEY is not set. Add it to the Claude environment's secrets.")
    if secret:
        return "Basic " + base64.b64encode(f"{key}:{secret}".encode()).decode()
    return key  # legacy keys go straight in the Authorization header


def base_url():
    env = os.environ.get("T212_ENV", "live").strip().lower()
    return f"https://{'demo' if env == 'demo' else 'live'}.trading212.com"


AUTH = None


def get(path, retries=4):
    url = path if path.startswith("http") else base_url() + path
    req = urllib.request.Request(url, headers={"Authorization": AUTH, "Accept": "application/json"})
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.loads(r.read().decode())
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < retries - 1:
                reset = e.headers.get("x-ratelimit-reset")
                wait = max(1, int(reset) - int(time.time())) if reset and reset.isdigit() else 15
                time.sleep(min(wait, 65))
                continue
            if e.code in (401, 403):
                sys.exit(f"Trading 212 refused {path} ({e.code}): check the key and its scopes. {e.read().decode()[:200]}")
            raise


def paged(path, max_pages=200):
    items, nxt, pages = [], path, 0
    while nxt and pages < max_pages:
        page = get(nxt)
        items.extend(page.get("items", []))
        nxt = page.get("nextPagePath")
        if nxt and not nxt.startswith(("http", "/api/")):
            nxt = API_VERSION + "/" + nxt.lstrip("/")
        pages += 1
    return items


def uk_tax_year_start(today):
    start = dt.date(today.year, 4, 6)
    return start if today >= start else dt.date(today.year - 1, 4, 6)


def build(prev):
    summary = get(f"{API_VERSION}/equity/account/summary")
    positions = get(f"{API_VERSION}/equity/positions")
    transactions = paged(f"{API_VERSION}/equity/history/transactions?limit=50")
    dividends = paged(f"{API_VERSION}/equity/history/dividends?limit=50")

    today = dt.date.today()
    ty_start = uk_tax_year_start(today)

    deposits = sum(t.get("amount", 0) for t in transactions if t.get("type") == "DEPOSIT")
    withdrawals = sum(abs(t.get("amount", 0)) for t in transactions if t.get("type") == "WITHDRAW")
    interest = sum(t.get("amount", 0) for t in transactions if t.get("type") in ("INTEREST_ON_FREE_CASH", "LENDING_INTEREST"))
    fees = sum(abs(t.get("amount", 0)) for t in transactions if t.get("type") == "FEE")

    def in_tax_year(s):
        try:
            return dt.date.fromisoformat((s or "")[:10]) >= ty_start
        except ValueError:
            return False

    div_ty = [d for d in dividends if in_tax_year(d.get("paidOn"))]
    cash = summary.get("cash") or {}
    inv = summary.get("investments") or {}

    holdings = []
    for p in positions:
        ins = p.get("instrument") or {}
        w = p.get("walletImpact") or {}
        holdings.append({
            "ticker": ins.get("ticker"),
            "name": ins.get("name"),
            "isin": ins.get("isin"),
            "currency": ins.get("currency"),
            "quantity": p.get("quantity"),
            "averagePrice": p.get("averagePricePaid"),
            "currentPrice": p.get("currentPrice"),
            "value": w.get("currentValue"),
            "cost": w.get("totalCost"),
            "gain": w.get("unrealizedProfitLoss"),
            "fxImpact": w.get("fxImpact"),
            "since": (p.get("createdAt") or "")[:10],
        })
    holdings.sort(key=lambda h: -(h["value"] or 0))

    paid_in = round(deposits - withdrawals, 2)
    total_value = summary.get("totalValue")
    point = {"date": today.isoformat(), "paid": paid_in, "value": total_value}
    history = [h for h in (prev.get("history") or []) if h.get("date") != point["date"]] + [point]
    history = sorted(history, key=lambda h: h["date"])[-520:]

    return {
        "source": "trading212",
        "updatedAt": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "currency": summary.get("currency"),
        "account": {
            "totalValue": total_value,
            "cashAvailable": cash.get("availableToTrade"),
            "cashInPies": cash.get("inPies"),
            "investedValue": inv.get("currentValue"),
            "investedCost": inv.get("totalCost"),
            "unrealisedGain": inv.get("unrealizedProfitLoss"),
            "realisedGain": inv.get("realizedProfitLoss"),
        },
        "paidIn": paid_in,
        "interestEarned": round(interest, 2),
        "fees": round(fees, 2),
        "holdings": holdings,
        "dividends": {
            "taxYearStart": ty_start.isoformat(),
            "taxYearTotal": round(sum(d.get("amount", 0) for d in div_ty), 2),
            "allTimeTotal": round(sum(d.get("amount", 0) for d in dividends), 2),
            "recent": [
                {"date": (d.get("paidOn") or "")[:10], "ticker": d.get("ticker"),
                 "name": (d.get("instrument") or {}).get("name"), "amount": d.get("amount")}
                for d in sorted(dividends, key=lambda d: d.get("paidOn") or "", reverse=True)[:12]
            ],
        },
        "history": history,
    }


def main():
    global AUTH
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), "..", "data", "portfolio.json")
    out = os.path.abspath(out)
    AUTH = auth_header()
    prev = {}
    if os.path.exists(out):
        with open(out) as f:
            prev = json.load(f)
    data = build(prev)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w") as f:
        json.dump(data, f, indent=2)
    print(f"Wrote {out}: value {data['account']['totalValue']} {data['currency']}, "
          f"paid in {data['paidIn']}, {len(data['holdings'])} holdings")


if __name__ == "__main__":
    main()
