// Progress-view analysis over session history.
// Reading rules validated in the progress-view prototype (ticket 05): a band drop or a
// ladder progression counts as improvement even when reps reset; volume (total reps) is
// the sparkline axis; kg breaks volume ties on the single-leg patterns.

import { BANDS, PATTERNS, PatternEntry, PatternId, SessionRow, canonical } from "./domain";

export interface SeriesPoint {
  date: string;
  entry: PatternEntry | null; // null = absent or pattern skipped that session
  volume: number | null; // total reps
  changeLabel: string | null; // set when variant/band changed vs previous point with data
}

export type TrendGlyph = "up" | "down" | "flat";
export interface Trend {
  glyph: TrendGlyph;
  label: string; // e.g. "+4 reps", "band ↓", "new variant", "static ×5"
  staticCount: number; // sessions at the identical entry (0 when trending)
}

export function volume(e: PatternEntry): number {
  return e.kind === "pullup" ? e.reps.reduce((a, b) => a + b, 0) : e.sets * e.reps;
}

function ladderIndex(patternId: PatternId, variant: string): number {
  return PATTERNS.find((p) => p.id === patternId)!.ladder.indexOf(variant);
}

/** Where an entry sits on its pattern's ladder/band, higher = more advanced. */
function stepIndex(patternId: PatternId, e: PatternEntry): number {
  return e.kind === "pullup" ? BANDS.indexOf(e.band) : ladderIndex(patternId, e.variant);
}

/** All of a player's rows (absent included), oldest first. */
export function playerRows(history: SessionRow[], playerId: string): SessionRow[] {
  return history
    .filter((r) => r.playerId === playerId)
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Chart series for one player+pattern across all their session rows. */
export function series(rows: SessionRow[], patternId: PatternId): SeriesPoint[] {
  let prev: PatternEntry | undefined;
  return rows.map((row) => {
    const e = row.patterns[patternId];
    if (!e) return { date: row.date, entry: null, volume: null, changeLabel: null };
    let changeLabel: string | null = null;
    if (prev) {
      if (e.kind === "pullup" && prev.kind === "pullup" && e.band !== prev.band) changeLabel = e.band;
      if (e.kind === "ladder" && prev.kind === "ladder" && e.variant !== prev.variant)
        changeLabel = e.variant;
    }
    prev = e;
    return { date: row.date, entry: e, volume: volume(e), changeLabel };
  });
}

/** Latest entry for player+pattern, or null. */
export function latestEntry(rows: SessionRow[], patternId: PatternId): PatternEntry | null {
  for (let i = rows.length - 1; i >= 0; i--) {
    const e = rows[i].patterns[patternId];
    if (e) return e;
  }
  return null;
}

export function trend(rows: SessionRow[], patternId: PatternId): Trend {
  const entries = rows.map((r) => r.patterns[patternId]).filter((e): e is PatternEntry => !!e);
  if (entries.length === 0) return { glyph: "flat", label: "—", staticCount: 0 };
  if (entries.length === 1) return { glyph: "flat", label: "first entry", staticCount: 1 };

  const cur = entries[entries.length - 1];
  const prev = entries[entries.length - 2];

  if (cur.kind === "pullup" && prev.kind === "pullup") {
    const d = stepIndex(patternId, cur) - stepIndex(patternId, prev);
    if (d > 0) return { glyph: "up", label: "band ↓", staticCount: 0 };
    if (d < 0) return { glyph: "down", label: "band ↑", staticCount: 0 };
  }
  if (cur.kind === "ladder" && prev.kind === "ladder" && cur.variant !== prev.variant) {
    const d = stepIndex(patternId, cur) - stepIndex(patternId, prev);
    if (d > 0) return { glyph: "up", label: "variant ↑", staticCount: 0 };
    if (d < 0) return { glyph: "down", label: "variant ↓", staticCount: 0 };
    return { glyph: "up", label: "new variant", staticCount: 0 };
  }

  const dv = volume(cur) - volume(prev);
  if (dv > 0) return { glyph: "up", label: `+${dv} reps`, staticCount: 0 };
  if (dv < 0) return { glyph: "down", label: `${dv} reps`, staticCount: 0 };
  if (cur.kind === "ladder" && prev.kind === "ladder" && (cur.kg ?? 0) !== (prev.kg ?? 0)) {
    const dk = (cur.kg ?? 0) - (prev.kg ?? 0);
    return dk > 0
      ? { glyph: "up", label: `+${dk}kg`, staticCount: 0 }
      : { glyph: "down", label: `${dk}kg`, staticCount: 0 };
  }

  let n = 1;
  const key = canonical(cur);
  for (let i = entries.length - 2; i >= 0 && canonical(entries[i]) === key; i--) n++;
  return { glyph: "flat", label: `static ×${n}`, staticCount: n };
}

export interface RankInfo {
  rank: number; // 1-based, competition ranking (ties share a rank, next rank skips)
  pool: number; // players with data for this pattern
}

const MIN_RANK_POOL = 3;

/**
 * Roster-wide competition rank per pattern, keyed by playerId. Ordered by ladder
 * step/band index first — the same signal trend() treats as dominant — then by
 * volume, then (on the two kg-tracked patterns) by kg, matching trend()'s own
 * "kg breaks volume ties" convention. Players with no recorded position for the
 * pattern are excluded from both rank and pool. Empty below MIN_RANK_POOL so no
 * one shows a degenerate "1st of 1"/"1st of 2".
 */
export function ranks(history: SessionRow[], patternId: PatternId): Record<string, RankInfo> {
  const pattern = PATTERNS.find((p) => p.id === patternId)!;
  const playerIds = Array.from(new Set(history.map((r) => r.playerId)));

  const entries = playerIds.flatMap((playerId) => {
    const e = latestEntry(playerRows(history, playerId), patternId);
    if (!e) return [];
    const kg = pattern.kg && e.kind === "ladder" ? (e.kg ?? 0) : 0;
    return [{ playerId, stepIndex: stepIndex(patternId, e), volume: volume(e), kg }];
  });

  if (entries.length < MIN_RANK_POOL) return {};

  entries.sort((a, b) => b.stepIndex - a.stepIndex || b.volume - a.volume || b.kg - a.kg);

  const out: Record<string, RankInfo> = {};
  let rank = 0;
  let prevKey = "";
  entries.forEach((e, i) => {
    const key = `${e.stepIndex}|${e.volume}|${e.kg}`;
    if (key !== prevKey) { rank = i + 1; prevKey = key; }
    out[e.playerId] = { rank, pool: entries.length };
  });
  return out;
}

/** Short position for board cells: "3×8 6kg" / "5/4/3 yellow". */
export function shortPos(e: PatternEntry | null): string {
  if (!e) return "—";
  if (e.kind === "pullup") return `${e.reps.join("/")}${e.band !== "none" ? ` ${e.band}` : ""}`;
  return `${e.sets}×${e.reps}${e.kg ? ` ${e.kg}kg` : ""}`;
}
