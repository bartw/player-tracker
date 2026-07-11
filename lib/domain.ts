// Domain model for the strength circuit.
// Canonical string grammar and variant ladders are locked decisions — see
// .scratch/circuit-tracker-pwa/issues/01-notion-history-schema.md and 04-entry-ui-prototype.md.

export const BANDS = ["black", "yellow", "blue", "none"] as const;
export type Band = (typeof BANDS)[number];

export type PatternId = "hpush" | "hpull" | "vpush" | "vpull" | "slhinge" | "slsquat";

export interface PatternDef {
  id: PatternId;
  label: string; // Notion property name
  ladder: string[]; // ordered regression → progression variant names ([] for pull-up)
  kg: boolean;
  pullup: boolean;
}

export const PATTERNS: PatternDef[] = [
  { id: "hpush", label: "H-push", kg: false, pullup: false,
    ladder: ["Hands-elevated push-up", "Hand-release push-up", "Deficit push-up"] },
  { id: "hpull", label: "H-pull", kg: false, pullup: false,
    ladder: ["Inverted row — feet lower", "Inverted row", "Inverted row — feet higher"] },
  { id: "vpush", label: "V-push", kg: false, pullup: false,
    ladder: ["Hands-elevated pike", "Pike push-up", "Feet-elevated pike push-up"] },
  { id: "vpull", label: "V-pull", kg: false, pullup: true, ladder: [] },
  { id: "slhinge", label: "SL-hinge", kg: true, pullup: false,
    ladder: ["SL-RDL (no KB)", "SL-RDL"] },
  { id: "slsquat", label: "SL-squat", kg: true, pullup: false,
    ladder: ["Split squat", "Bulgarian split squat"] },
];

export interface LadderEntry { kind: "ladder"; variant: string; sets: number; reps: number; kg?: number }
export interface PullupEntry { kind: "pullup"; reps: [number, number, number]; band: Band }
export type PatternEntry = LadderEntry | PullupEntry;
export type PatternMap = Partial<Record<PatternId, PatternEntry>>;

export interface SessionRow {
  pageId: string;
  playerId: string;
  date: string; // YYYY-MM-DD
  patterns: PatternMap;
  notes: string;
}

// Session-1 starting positions (Strength circuit page) — prefill for players with no history.
export const DEFAULT_ENTRY: Record<PatternId, PatternEntry> = {
  hpush: { kind: "ladder", variant: "Hand-release push-up", sets: 2, reps: 6 },
  hpull: { kind: "ladder", variant: "Inverted row", sets: 2, reps: 6 },
  vpush: { kind: "ladder", variant: "Pike push-up", sets: 2, reps: 4 },
  vpull: { kind: "pullup", reps: [0, 0, 0], band: "black" },
  slhinge: { kind: "ladder", variant: "SL-RDL", sets: 2, reps: 6, kg: 4 },
  slsquat: { kind: "ladder", variant: "Bulgarian split squat", sets: 2, reps: 6, kg: 4 },
};

/** The exact string written to (and parsed back from) Notion. */
export function canonical(e: PatternEntry): string {
  if (e.kind === "pullup") {
    return `Pull-up ${e.reps.join("/")}` + (e.band !== "none" ? ` ${e.band}` : "");
  }
  return `${e.variant} ${e.sets}×${e.reps}` + (e.kg ? ` ${e.kg}kg` : "");
}

const PULLUP_RE = /^Pull-up (\d+)\/(\d+)\/(\d+)(?: (black|yellow|blue))?$/;
const LADDER_RE = /^(.+?) (\d+)×(\d+)(?: (\d+(?:\.\d+)?)kg)?$/;

export function parseEntry(text: string): PatternEntry | null {
  const t = text.trim();
  if (!t) return null;
  const p = PULLUP_RE.exec(t);
  if (p) {
    return { kind: "pullup", reps: [+p[1], +p[2], +p[3]], band: (p[4] as Band) ?? "none" };
  }
  const l = LADDER_RE.exec(t);
  if (l) {
    const e: LadderEntry = { kind: "ladder", variant: l[1], sets: +l[2], reps: +l[3] };
    if (l[4]) e.kg = +l[4];
    return e;
  }
  return null;
}

export function entriesEqual(a: PatternEntry | undefined, b: PatternEntry | undefined): boolean {
  if (!a || !b) return a === b;
  return canonical(a) === canonical(b);
}

/**
 * Prefill for (player, date): per pattern, the most recent entry strictly before `date`.
 * Reaching back per pattern (not per row) keeps an injured/skipped pattern's position
 * alive across the sessions it was missing from.
 */
export function prefillPatterns(history: SessionRow[], playerId: string, date: string): PatternMap {
  const rows = history
    .filter((r) => r.playerId === playerId && r.date < date)
    .sort((a, b) => b.date.localeCompare(a.date));
  const out: PatternMap = {};
  for (const pat of PATTERNS) {
    const row = rows.find((r) => r.patterns[pat.id]);
    if (row) out[pat.id] = row.patterns[pat.id];
  }
  return out;
}

/** "Unchanged for N sessions" when a pattern has been identical for >= 3 of the player's rows. */
export function staticStreak(history: SessionRow[], playerId: string, pattern: PatternId): number {
  const rows = history
    .filter((r) => r.playerId === playerId && r.patterns[pattern])
    .sort((a, b) => b.date.localeCompare(a.date));
  if (rows.length === 0) return 0;
  const latest = canonical(rows[0].patterns[pattern]!);
  let n = 0;
  for (const r of rows) {
    if (canonical(r.patterns[pattern]!) === latest) n++;
    else break;
  }
  return n;
}
