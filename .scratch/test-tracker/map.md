# Map: Test Tracker page

Label: wayfinder:map

## Destination

The deployed circuit-tracker app gains a separate `/tests` page: record test results per dated test day and view each player's Δ% against baseline, backed by a new Test Results (app) Notion database related to Players, with the 5 existing baselines backfilled as 2026-07-01 rows. Done when the page is live with baselines visible and a test entry is verified end-to-end.

## Notes

- **Execution is in scope for this map** (same override as the circuit effort): the destination is a working page.
- Domain: 6 tests — 10m sprint (s, lower better), 2-1-1-2 broad jump (cm), single broad jump (cm), T-test (s, lower better), 1-min hand-release push-ups (reps), Yo-Yo IR1 (m). Tests happen on a handful of dated test days (BL was 2026-07-01; W4/W8 upcoming); the window names are just labels — the schema is date-keyed like Circuit Sessions.
- Source: [old Player Test Tracker](https://app.notion.com/p/ad918919f8864e7ca671903a8ee9b9a1) (`collection://cce10c7f-f519-40a1-9d57-99d3207a5f79`) — wide BL/W4/W8 columns, name-keyed, 5 players with full baselines, no W4/W8 data yet. It stays as-is (holds Maturation, which the app ignores by decision).
- App context: everything from the [circuit map](../circuit-tracker-pwa/map.md) applies — Next.js at repo root, `/api/*` behind the PIN cookie, Notion SDK v5 pinned to `2026-03-11`, Players (app) database is the roster (11 players), deploy = push to `main` (https://player-tracker-livid.vercel.app). Keep tests strictly on their own page — do not mix with strength results (explicit user requirement).
- Skills: /grilling for decisions, /prototype for UI, /research if API questions surface.
- Decisions locked during charting: **enter + view** in the app; **new database, one row per player per test-day** (relation to Players, Date, 6 number properties, Notes); Δ% computed in the app (baseline = player's earliest row); **maturation stays in the old table**, out of the app.
- Tracker: local markdown (this directory), same conventions as the circuit map.

## Decisions so far

<!-- one line per closed ticket: gist + link -->

## Not yet specified

<!-- nothing — the route is fully ticketed; fog may reappear from the prototype -->

## Out of scope

- **Maturation in the app** — stays in the old Notion table (charting decision).
- **Benchmarks / percentiles / age-group comparisons** — Δ% vs own baseline only.
- **Exports or player/parent-facing reports** — coach-only, same as the circuit app.
- **Retiring the old Player Test Tracker** — coach may keep or archive it by hand; not the app's concern.
