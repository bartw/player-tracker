# Player Tracker

Tracks youth hockey players' strength-circuit progress and periodic physical test results, backed by Notion as the datastore.

## Language

### Strength circuit

**Pattern**: One of six movement categories tracked per session — H-push, H-pull, V-push, V-pull, SL-hinge, SL-squat.
_Avoid_: Exercise, movement, lift

**Variant**: A named movement within a pattern's ladder (e.g. "Hand-release push-up"), ordered regression → progression.
_Avoid_: Exercise name, level

**Ladder**: The ordered list of variants for a pattern, from regression to progression. V-pull has no ladder — it uses a band instead.
_Avoid_: Progression path, tier list

**Band**: The assistance level for V-pull (pull-up), ordered black → yellow → blue → none (black = most assistance).
_Avoid_: Resistance, assist level

**Position**: A player's current variant/reps/sets (and kg, band where relevant) for one pattern — the thing that advances or regresses session to session.
_Avoid_: Entry, state, level

**Session**: One practice's worth of positions recorded for one player, on a date. A player who didn't attend gets an absent session, not a missing one.
_Avoid_: Workout, entry, log

**Absent**: A session explicitly marked as not attended — distinct from a session that was never logged. Carries no positions and is ignored by prefill and streak logic.
_Avoid_: Skipped, no-show

**Static streak**: The number of consecutive sessions a player's position on a pattern hasn't changed — the signal for "time to progress?".
_Avoid_: Plateau, stall (stall is fine informally but static streak is the precise term)

**Rank**: A player's competition-style ordinal standing among teammates on one pattern — ladder step/band first, volume (or kg) as tiebreak, ties sharing a rank with the next rank skipped. Scoped to players who have data for that pattern; suppressed below a minimum pool size.
_Avoid_: Percentile, score, leaderboard position

### Physical testing

**Test**: One of six standardized fitness measures — sprint, jump, single jump, T-test, push-ups, Yo-Yo — recorded on a test day.
_Avoid_: Metric, measurement

**Test day**: A dated round where a player's tests are recorded, independent of strength-circuit sessions.
_Avoid_: Test session (reserve "session" for the strength circuit)

**Baseline**: A player's earliest recorded value for a test — the reference point Δ% is measured against.
_Avoid_: Starting value, first result

**Δ%**: Percent change from baseline to latest, sign-normalized so positive always means improvement (sprint/T-test are lower-is-better, so their sign is flipped).
_Avoid_: Delta, change, improvement (improvement is the effect, Δ% is the term)
