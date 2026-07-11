# Build the progress view

Type: task
Status: resolved
Blocked by: 07

## Question

Build the two-screen progress surface per the progress-view prototype's Answer: Team board home (squad × patterns grid, trend glyphs, loud "static ×N" badges — stall-detection is the primary question) → tap a player → Report card detail (volume sparklines per pattern, ringed variant/band-change markers, band strip under pull-up, absence dots).

History = full Circuit Sessions read (paginated, ~4 pages at season end), fetched once and cached app-side per the API research. Done when both screens render real Notion data on the phone.

Reference (throwaway, do not promote): [progress-view-prototype.html](../assets/progress-view-prototype.html).

## Answer

Resolved 2026-07-11. Live at https://player-tracker-livid.vercel.app/progress (commit `c72f1ef`), verified against the coach's real backfilled data (11 players, 4 sessions).

- `/progress` = Team board home: squad × 6 patterns, trend glyph (▲▬▼) vs previous session + latest short position per cell, "static ×N" badge at ≥3 identical sessions. Tap a row → Report card: per-pattern volume sparklines with ringed+labeled variant/band changes, trend chip, band strip under the pull-up, gray floor dots for absent/skipped sessions.
- `lib/progress.ts` holds the analysis: trend rules exactly as the prototype validated them (band drop / ladder progression = improvement despite rep resets; kg delta breaks volume ties on SL patterns), series building over all rows including absences.
- History is fetched once via the existing `/api/history` and computed client-side; same retry affordance as the entry flow.
- Incidental fix while verifying: two players now share a first name (Finn Pallen / Finn Schouterden), so short names disambiguate with a last initial everywhere (`displayNames` in `lib/domain.ts`, used by both pages).
