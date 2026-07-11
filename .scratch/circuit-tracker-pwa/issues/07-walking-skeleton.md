# Deploy a walking skeleton

Type: task
Status: resolved
Blocked by: 01, 02, 06

## Question

Stand up the thinnest end-to-end slice: an installable PWA shell, deployed on Vercel behind the chosen access lock, whose proxy holds the Notion token. Includes running the **setup script** that creates the two Notion databases (Circuit Sessions + Players, per the schema ticket's Answer), then writing one session row and reading it back through the app.

Done when the coach can open the app on their phone, tap something, and see a row appear in Notion. No real entry UI yet — that build gets sliced after the prototypes resolve (see map: Not yet specified).

Resolution should record: repo layout, deploy URL, where credentials live, and both new database IDs.

## Answer

Resolved 2026-07-11. Verified end-to-end on production: PIN lock (401 without cookie / wrong PIN), unlock, row written to Notion from the deployed app, row read back.

- **Deploy URL**: https://player-tracker-livid.vercel.app (note: `player-tracker.vercel.app` belongs to a stranger's project — don't use it). Production tracks `main` on `bartw/player-tracker`.
- **Repo layout**: Next.js App Router at repo root — `app/` (page + `api/unlock` + `api/skeleton-test`), `lib/notion.ts` (client factory, cookie/hash helpers), `middleware.ts` (PIN-cookie gate on `/api/*`, handlers re-check), `scripts/setup-notion.ts` (one-shot DB creation, already run), `public/` (manifest, no-op SW, placeholder icons — proper icon in the first-real-session ticket).
- **Credentials**: locally in gitignored `.env.local`; on Vercel as project env vars (`NOTION_TOKEN`, `APP_PIN`, `NOTION_PLAYERS_DS_ID`, `NOTION_SESSIONS_DS_ID`). The Notion integration is named `player-tracker`, connected to the Off-Ice Summer Program page. Recommended: rotate the token when convenient (it briefly sat in a non-gitignored file and this session's transcript; never committed).
- **Notion databases** (under the program page):
  - Players (app): database `a54186e7-1c00-46af-a05f-1a0df693b15e`, data source `36d4d0e2-dd02-4b91-b8ae-82a70b956fb6` — 5 players seeded.
  - Circuit Sessions (app): database `3cd419c1-94e1-454e-9344-bbf2d577176c`, data source `535abb6b-f895-4620-89ca-cfa0a901943a` — contains skeleton-test rows marked "Safe to delete"; clean them before/during backfill.
