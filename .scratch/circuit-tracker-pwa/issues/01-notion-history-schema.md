# Design the new Notion history schema

Type: grilling
Status: resolved

## Question

What shape does the new Notion tracker database take so it holds per-session history and supports the app's suggestion engine?

To resolve (via /grilling + /domain-modeling):

- Grain: one row per player-session? Per player-pattern-session? Per position-change event?
- Properties: how are variant (R/S/P) and step (1–6) stored per pattern — structured selects vs the current `"R 3x4"` text? Clean/not-clean flag? Coach override marker? Session date?
- Where does the player roster live — derived from rows, a separate Notion database, or app config?
- How does the app derive "current position" and "suggested next position" from this shape efficiently (~15 players × 6 patterns × ~24 sessions)?
- Does the database get created by hand in Notion or programmatically by the app/proxy?

Context: current tracker is one row per player, current state only ([Strength Circuit Tracker](https://app.notion.com/p/740ac6e116e34b37ac096b338112761f), `collection://30ea1668-e862-4f95-85c9-e7fa2b0bfc82`). Ladder rules on the [Strength circuit page](https://app.notion.com/p/38c3ce70714b8036a4dffef19cd92460).

## Answer

Resolved 2026-07-10 by grilling session.

### Domain-model corrections (documented model was stale)

Inspecting real tracker entries (`S 3 x 6`, `S 2 x 6 4KG`, rungs like 3×5/3×4/3×2) and grilling surfaced:

- The universal 6-step ladder (2×4 → 3×10) is **not** what happens in the gym: sets×reps are free, chosen by feel.
- **V-pull (pull-up) is a different scheme entirely**: 3 sets to max reps, with an optional assistance band — band ladder **black > yellow > blue > none** (black = most assist). Coach currently writes e.g. `5/4/3 yellow`.
- **KB weight is part of the position** for SL-hinge and SL-squat.
- Variant lists on the Strength circuit page have drifted; letter codes (R/S/P) are unmemorable — use full movement names.
- Advance/regress rules are applied loosely, by coach's feel — no strict rules engine.
- Current roster in the tracker is **5 players** (2 with data), not the ~15 in the program doc.

### Schema

Two new Notion databases, created by an **app setup script** (not by hand):

1. **Circuit Sessions** — grain: one row per player per session. Properties:
   - Title: `<Player> — <date>` (app-generated, for Notion readability)
   - **Player**: relation → Players database
   - **Date**: session date
   - **H-push, H-pull, V-push, V-pull, SL-hinge, SL-squat**: rich text, each a canonical readable string the app writes and parses (app is sole writer):
     - Ladder patterns: `<Variant name> <sets>×<reps>` (e.g. `Hand-release push-up 3×6`), with ` <n>kg` appended for SL-hinge/SL-squat (e.g. `SL-RDL 3×6 6kg`)
     - Pull-up: `Pull-up <r1>/<r2>/<r3> <band>` (e.g. `Pull-up 5/4/3 yellow`); band omitted when none
   - **Notes**: text
2. **Players** — one row per player, title = name; future fields (maturation etc.) can attach here.

### App behavior implied

- **Suggestion = prefill + gentle nudge**: each pattern prefills from the player's most recent row; a soft hint appears when a pattern has been static for a few sessions. No rule engine pre-applying positions.
- **Absence = no row** for that player-date; prefill reaches back to the last actual row.
- **Roster** from the Players database, with add-player in the app.
- **Variant ladders** (ordered regression→progression movement names per pattern) live as config in app code; the real current lists get captured during the entry-UI prototype.
- Manual backfill = same entry flow with a past date (unchanged from map).
