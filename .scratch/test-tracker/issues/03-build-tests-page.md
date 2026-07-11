# Build the tests page

Type: task
Status: open
Blocked by: 01, 02

## Question

Build `/tests` per the prototype's winner: test-day entry writing rows to Test Results (app) via the proxy (upsert on player+date, same safety as the circuit flow), and the Δ% progress view (baseline = earliest row per player; sprint and T-test are lower-is-better). Navigation: link from both existing pages; tests stay strictly separate from strength content.

Done when the page is live in production with the backfilled baselines rendering and a verified end-to-end test entry (then cleaned up). Resolution records routes, lib modules, and any schema gotchas.
