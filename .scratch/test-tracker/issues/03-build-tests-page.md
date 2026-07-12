# Build the tests page

Type: task
Status: resolved
Blocked by: 01, 02

## Question

Build `/tests` per the prototype's winner: test-day entry writing rows to Test Results (app) via the proxy (upsert on player+date, same safety as the circuit flow), and the Δ% progress view (baseline = earliest row per player; sprint and T-test are lower-is-better). Navigation: link from both existing pages; tests stay strictly separate from strength content.

Done when the page is live in production with the backfilled baselines rendering and a verified end-to-end test entry (then cleaned up). Resolution records routes, lib modules, and any schema gotchas.

## Answer

Resolved 2026-07-12. Live at https://player-tracker-livid.vercel.app/tests (commit `9a1b5d6`); production verified — page serves, `/api/test-history` locked without the PIN cookie, and with it returns 11 players + the 5 baseline rows.

- **Progress mode** (home): team Δ% table (players × 6 tests, latest value + direction-aware badge vs own baseline) → tap for the player card (baseline → latest trail per test). **Test day mode**: date bar with backfill badge, test chips, squad list with last-value hints and per-test numeric inputs; blank = not tested.
- **Saves merge**: upsert keyed on (player, date) writes only the measured columns, so saving station by station is safe. Verified end-to-end locally against the real database: two saves (sprint, then push-ups) merged into one row per player, Δ% rendered +2% for a faster sprint and +20% for more push-ups; test rows trashed afterwards.
- Modules: `lib/tests.ts` (client-safe domain: TEST_DEFS, deltaPct/latest/baseline), `lib/tests-io.ts` (server Notion I/O — split out after the SDK bloated the client bundle from 105 to 246 kB), routes `app/api/test-history` + `app/api/log-tests`, page `app/tests/page.tsx`. Nav wired across all three pages; tests never mix with strength content.
- `NOTION_TESTS_DS_ID` added to Vercel env vars by the coach and redeployed.
