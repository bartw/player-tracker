# Build the entry flow

Type: task
Status: resolved
Blocked by: 07

## Question

Build the real after-session entry flow on the walking skeleton, per the entry-flow prototype's Answer (variant C — Confirm sheet): per-player summary list carrying last session forward, tap-to-edit bottom sheet with the 6-pattern editor (variant pickers from the captured ladders, sets/reps steppers, kg on SL patterns, pull-up 3×max + band chips), absent toggle (no row), date picker with backfill badge, static-nudge hints, and a save preview of the canonical Notion strings before the write burst.

Prefill = the player's most recent Circuit Sessions row (query per the API research); online-only error handling (clear failure message, safe retry — write burst must be idempotent-ish or resumable). Done when a full fake session can be logged end-to-end from the phone against the real Notion databases and the rows read back correctly.

Reference (throwaway, do not promote): [entry-flow-prototype.html](../assets/entry-flow-prototype.html).

## Answer

Resolved 2026-07-11. Live in production at https://player-tracker-livid.vercel.app (commit `a2388ad`).

Built as specified — confirm-sheet home, bottom-sheet editor (variant pickers from the captured ladders, sets/reps/kg steppers, pull-up 3×max + band chips), static-streak nudges, date picker with backfill badge, save preview of canonical strings, absent toggle. Key implementation facts:

- `lib/domain.ts` holds the domain: pattern config + variant ladders, canonical()/parseEntry() for the string grammar, static-streak nudge logic, session-1 defaults for first entries.
- `lib/sessions.ts` + `/api/history` (full paginated read) + `/api/log-session` (sequential writes for rate limits).
- **Saves are upserts keyed on (player, date)** — retry after partial failure is safe; verified by double-saving (no duplicates, edits preserved).
- **Absent with an existing row archives it** — and this surfaced an API fact the research missed: version `2026-03-11` renamed `archived` to `in_trash` on page updates.
- Transient Notion "fetch failed" happened twice during verification; a Retry button now covers the load path, and failed saves report clearly with safe retry.

Verified end-to-end against live Notion: full session written (5 rows, exact canonical strings), re-save updated in place, absent archived Tijs's row. All test rows trashed afterwards — the database is clean for the real first session. Note: the home page links to `/progress`, which 404s until the progress-view ticket builds it.
