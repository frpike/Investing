# Investing

Two things live here:

- **`web/`** – Groundwork, an investing education app (Next.js + Supabase + Claude). Start with
  [`docs/PLAN.md`](docs/PLAN.md) for the product plan and [`web/README.md`](web/README.md) to run it.
- **Fiver a Day** – a personal notebook page and Trading 212 sync, described below.

# Fiver a Day

A beginner's investing notebook for putting £5 a day into a Trading 212 Invest account.

- **The page:** https://claude.ai/artifact/JJCRDiBtQjngUmtfru937o (private to you).
  Plan, 12 lessons, growth calculator, portfolio tracker and an Insights tab that
  explains what you own. Progress saves to your Claude account.
- **`fiver-a-day.html`** – the page's source.
- **`sync/t212_sync.py`** – reads your Trading 212 account (read-only API key) into
  `data/portfolio.json`.
- **`sync/WEEKLY.md`** – what the Sunday scheduled task does: sync, back up progress,
  write weekly notes, update the page, remind you.

## Connecting Trading 212

1. In the Trading 212 app, create an API key with only these permissions:
   account, portfolio, history (dividends, transactions). **Never orders.**
2. Add it to the Claude environment's secrets as `T212_API_KEY` (and
   `T212_API_SECRET` if you were given one). Never commit it or paste it into a chat.

## Your data and this repository

This repository is **public**, so `data/` is git-ignored and nothing personal is
committed. Make the repository private (GitHub → Settings → General → Danger Zone →
Change visibility) and the weekly job will start backing up your progress and
portfolio history here too.

Education only, not financial advice. Your capital is at risk.
