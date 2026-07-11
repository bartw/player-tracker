# Prototype the tests page

Type: prototype
Status: resolved

Prototype asset: [tests-page-prototype.html](../assets/tests-page-prototype.html) — four variants (`?variant=A` Station entry / `B` Player entry / `C` Team Δ% table / `D` Player cards), real baselines + fake W4 data. Serve with `python3 -m http.server 8123 --directory .scratch` and open `http://localhost:8123/test-tracker/assets/tests-page-prototype.html`.

## Question

What do test-day entry and Δ% viewing look like on the phone? Throwaway variants (via /prototype) to react to; link the asset here.

To resolve:

- Entry shape: **station-style per test** (one test, all players — matches how a test day runs: everyone sprints, then everyone jumps) vs **per player** (one kid, all 6). Number-pad ergonomics for times (2.35 s) vs counts/distances.
- Untested cells: a player absent on test day or skipping one test — blank cell, no ceremony? (No absent concept like the circuit? Decide by feel in the prototype.)
- View shape: team table (players × tests, Δ% color/glyph vs baseline) vs per-player card (6 tests, value trail BL → latest with Δ%); which is home. Lower-is-better tests (sprint, T-test) must read correctly (faster = green).
- How a new test day starts in the UI (date picker like the circuit page?).

Schema is decided (map Notes); fake a W4 dataset over the real baselines to react against.

## Answer

Resolved 2026-07-11. Coach reviewed all four variants (asset linked above).

- **Entry: A — Station entry.** Date bar (defaults today), test chips, then the whole squad in one list — each row shows the player's last value as reference and a large numeric input (`inputmode=decimal`, per-test step). Blank input = not tested that day, no ceremony; no absent concept on tests. Save previews the rows before writing.
- **View: C home → D detail.** Team Δ% table (players × 6 tests, latest value + Δ% badge vs own baseline) as the landing view, tap a player for their card trail (baseline → latest per test). Mirrors the circuit page's board → detail pattern.
- **Direction validated**: Δ% = `dir × (latest − baseline) / baseline`, dir = −1 for sprint and T-test — a slower sprint reads red, faster green. First-test-day players show plain values, no badge; players with no rows show —.
- Name disambiguation reuses `displayNames` (two Finns).

Prototype stays as a build reference; throwaway, not to be promoted.
