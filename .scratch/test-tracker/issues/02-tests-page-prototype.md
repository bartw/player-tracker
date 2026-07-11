# Prototype the tests page

Type: prototype
Status: open

## Question

What do test-day entry and Δ% viewing look like on the phone? Throwaway variants (via /prototype) to react to; link the asset here.

To resolve:

- Entry shape: **station-style per test** (one test, all players — matches how a test day runs: everyone sprints, then everyone jumps) vs **per player** (one kid, all 6). Number-pad ergonomics for times (2.35 s) vs counts/distances.
- Untested cells: a player absent on test day or skipping one test — blank cell, no ceremony? (No absent concept like the circuit? Decide by feel in the prototype.)
- View shape: team table (players × tests, Δ% color/glyph vs baseline) vs per-player card (6 tests, value trail BL → latest with Δ%); which is home. Lower-is-better tests (sprint, T-test) must read correctly (faster = green).
- How a new test day starts in the UI (date picker like the circuit page?).

Schema is decided (map Notes); fake a W4 dataset over the real baselines to react against.
