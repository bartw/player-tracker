# Prototype the progress view

Type: prototype
Status: resolved
Blocked by: 01

Prototype asset: [progress-view-prototype.html](../assets/progress-view-prototype.html) — three variants (`?variant=A` Report card / `B` Team board / `C` Changelog), self-contained HTML with 4 weeks of plausible fake history (progressions, a variant change, a band drop, a regression, absences). Serve with `python3 -m http.server 8123 --directory .scratch/circuit-tracker-pwa/assets` and open `http://localhost:8123/progress-view-prototype.html`.

## Question

What does "see each player's 8-week journey" actually look like? Build a throwaway prototype (via /prototype) to react to; link it as an asset.

To resolve:

- Per-player view: all 6 patterns over time — volume chart (total reps per session), variant-change timeline, or session-by-session list? There is no step ladder; variant + sets×reps (+kg) is the position.
- How variant changes (regression/progression movements) render distinctly from volume climbs — total reps may make a clean single axis, with variant switches as markers; kg progression matters on the SL patterns.
- Pull-up chart: max-rep sets + band level (black > yellow > blue > none) — band drops are the headline progress.
- Team overview: is there a whole-squad screen (who's stalling, who's climbing) or only per-player?
- What question the coach actually asks of this view mid-program vs at the end.

Depends on the schema ticket (resolved — see its Answer for the canonical string grammar and what history exists to plot).

## Answer

Resolved 2026-07-11. Coach reviewed all three variants in the prototype (linked above).

**Winner: B home → A detail, stall-detection first.** The progress surface is two screens:

1. **Team board (home)** — squad × 6 patterns grid: latest position + trend glyph per cell (▲ improved last session / ▬ unchanged / ▼ regressed), with a "static ×N" badge when a pattern has been unchanged ≥3 sessions. The coach's primary mid-program question is "who's stuck and needs a push?", so the static badges are the headline signal and should be visually loudest.
2. **Report card (detail)** — tap a player: all six patterns as volume sparklines (total reps per session), rings + labels marking variant changes and band changes, per-pattern trend chip, and a per-session band strip under the pull-up chart. Gray floor dots mark absences.

Validated in the prototype: volume (total reps) works as the single sparkline axis with variant switches as labeled ring markers; pull-up progress reads band-first (the band strip), reps second; trend classification (band drop = improvement even when reps reset; variant progression = improvement even when volume resets) matched coach intuition. Variant C (changelog feed) lost but its change-detection logic feeds the trend glyphs.

The prototype file stays as a build reference asset; throwaway code, not to be promoted directly.
