# Weekly job

Instructions for the Sunday "Weekly Fiver check-in" scheduled task. Steps that fail
are skipped and mentioned in the final reply; never invent figures.

Page: https://claude.ai/artifact/JJCRDiBtQjngUmtfru937o

1. **Repo.** Attach `frpike/Investing` with `add_repo` (push access), clone it if
   needed, and check out `main`.
2. **Previous data.** Read the page's published `portfolio.json` with the Artifact
   tool (`action: "read"`, `path: "portfolio.json"`) and save it to
   `data/portfolio.json` so history carries over. Fine if it doesn't exist yet.
3. **Trading 212 sync.** If `T212_API_KEY` is set, run `python3 sync/t212_sync.py`.
   The key must be read-only. Never call any Trading 212 endpoint that places,
   changes or cancels orders.
4. **Progress backup.** Read the page's `notebook/main` document with
   ArtifactData and save its data as `data/progress.json`.
5. **Weekly notes.** Write `data/insights.json`:
   ```json
   {"date": "YYYY-MM-DD", "summary": "2-3 sentences", "learn": ["1-3 short bullets"],
    "holdings": {"<ticker>": "one sentence on what moved it or what to understand about it"}}
   ```
   Base it on `data/portfolio.json` and `data/progress.json`; a quick web search
   for news on each holding is fine. Education only: explain, don't tell them to
   buy or sell anything, and don't predict prices.
6. **Publish.** Read the artifact first (`action: "read"`), then publish
   `fiver-a-day.html` to the page URL with
   `files: {"portfolio.json": "data/portfolio.json", "insights.json": "data/insights.json"}`
   (leave out any file that doesn't exist). Don't pass `capabilities`.
7. **GitHub backup.** Check the repo's visibility with `list_repos`. Only if it is
   **private**: `git add -f data/`, commit "Weekly sync YYYY-MM-DD" and push to
   `main`. If it's public, skip this and say so.
8. **Reply** (this becomes the phone notification) in under 150 words: this week's
   value and paid-in figures if synced, a reminder to open the page's Insights tab,
   whether the sync and backup worked, and one beginner tip. If it's the first
   Sunday of April, remind them to download Trading 212's yearly statement.
   End with "Education only, not financial advice."
