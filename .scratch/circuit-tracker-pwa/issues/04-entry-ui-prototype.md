# Prototype the after-session entry flow

Type: prototype
Status: resolved
Blocked by: 01

Prototype asset: [entry-flow-prototype.html](../assets/entry-flow-prototype.html) — three variants (`?variant=A` Player walk / `B` Poster columns / `C` Confirm sheet), self-contained HTML, real player names + real last-session data, in-memory only. Serve with `python3 -m http.server 8123 --directory .scratch/circuit-tracker-pwa/assets` and open `http://localhost:8123/entry-flow-prototype.html`.

## Question

What does the 2-minute after-session transcription look like on a phone? Build a throwaway prototype (via /prototype) to react to; link it as an asset.

To resolve:

- Layout: per-player card walking all 6 patterns, or per-pattern list of players (mirroring the poster's columns)?
- The prefill interaction: every pattern starts at the player's last entry — what's the gesture to bump reps/sets, switch variant, or adjust kg? How does the gentle "static for a few sessions" nudge appear without nagging?
- Pull-up entry: three max-rep numbers + band picker (black/yellow/blue/none) — different control than the other five patterns.
- **Capture the real variant ladders per pattern from the coach** (ordered regression→progression movement names) — the documented table is stale; these become the app-code config the pickers use.
- Session date handling, including picking a past date (this same flow is the backfill mechanism for existing data).
- Absent toggle — skips the player, writes no row.

Depends on the schema ticket (resolved — see its Answer for the domain shape and canonical string grammar).

## Answer

Resolved 2026-07-11. Coach reviewed all three variants in the prototype (linked above).

**Winner: variant C — Confirm sheet.** The entry screen is a per-player summary list where every player silently carries their last session forward; the coach taps only the players who changed, edits in a bottom sheet holding the full 6-pattern editor, and saves once. Specifics validated in the prototype:

- Date picker at top, defaulting to today; a past date shows a "backfill" badge — this same flow is the manual-backfill mechanism.
- Absent toggle per player → that player writes no row; the summary row says so explicitly.
- Per-pattern controls: variant dropdown + sets/reps steppers; kg stepper on SL-hinge/SL-squat; pull-up gets three max-rep steppers + band chips (black/yellow/blue/none).
- The 💡 nudge ("Unchanged for N sessions — time to progress?") renders inline under the pattern row, only when unedited this session.
- Save shows exactly the canonical Notion strings before writing (`Pull-up 5/4/3 yellow`, `SL-RDL 2×6 4kg`) — matched the schema grammar 1:1 in testing.
- Status chips per player (same as last / edited / absent) give the pre-save overview.

**Variant ladders captured** (coach confirmed the doc's lists are correct; pull-up reworked to bands) — this becomes the app-code config:

- H-push: Hands-elevated push-up → Hand-release push-up → Deficit push-up
- H-pull: Inverted row feet lower → Inverted row → Inverted row feet higher
- V-push: Hands-elevated pike → Pike push-up → Feet-elevated pike push-up
- V-pull: Pull-up with band ladder black > yellow > blue > none (3 sets to max)
- SL-hinge: SL-RDL no KB → SL-RDL + kg
- SL-squat: Split squat → Bulgarian split squat + kg

The prototype file stays as a build reference asset; it is throwaway code and must not be promoted directly to production.
