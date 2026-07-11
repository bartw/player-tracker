# Build the entry flow

Type: task
Status: claimed
Blocked by: 07

## Question

Build the real after-session entry flow on the walking skeleton, per the entry-flow prototype's Answer (variant C — Confirm sheet): per-player summary list carrying last session forward, tap-to-edit bottom sheet with the 6-pattern editor (variant pickers from the captured ladders, sets/reps steppers, kg on SL patterns, pull-up 3×max + band chips), absent toggle (no row), date picker with backfill badge, static-nudge hints, and a save preview of the canonical Notion strings before the write burst.

Prefill = the player's most recent Circuit Sessions row (query per the API research); online-only error handling (clear failure message, safe retry — write burst must be idempotent-ish or resumable). Done when a full fake session can be logged end-to-end from the phone against the real Notion databases and the rows read back correctly.

Reference (throwaway, do not promote): [entry-flow-prototype.html](../assets/entry-flow-prototype.html).
