# Ladder variant lists live in app code, not Notion

The ordered regression → progression variant names per pattern (`PATTERNS` in `lib/domain.ts`) are hardcoded in the app rather than editable in Notion, unlike per-session data which Notion owns. The ladders are coach-authoritative and change rarely, so we favored a single source of truth reviewable in code over giving coaches a Notion table that could drift out of sync with the app's parsing logic.
