// Test-results domain (wayfinder: .scratch/test-tracker/). Client-safe — no Notion imports.
// Six tests on dated test days; Δ% vs a player's earliest row, direction-aware
// (sprint and T-test are lower-is-better).

export interface TestDef {
  id: TestId;
  label: string; // Notion property name
  unit: string;
  dir: 1 | -1; // +1 higher is better, -1 lower is better
  step: string; // input step for entry UI
}

export type TestId = "sprint" | "jump" | "sjump" | "ttest" | "push" | "yoyo";

export const TEST_DEFS: TestDef[] = [
  { id: "sprint", label: "Sprint (s)", unit: "s", dir: -1, step: "0.001" },
  { id: "jump", label: "Jump (cm)", unit: "cm", dir: 1, step: "1" },
  { id: "sjump", label: "Single Jump (cm)", unit: "cm", dir: 1, step: "1" },
  { id: "ttest", label: "T-test (s)", unit: "s", dir: -1, step: "0.01" },
  { id: "push", label: "Push-ups", unit: "", dir: 1, step: "1" },
  { id: "yoyo", label: "Yo-Yo (m)", unit: "m", dir: 1, step: "20" },
];

export type TestValues = Partial<Record<TestId, number>>;

export interface TestRow {
  pageId: string;
  playerId: string;
  date: string; // YYYY-MM-DD
  values: TestValues;
  notes: string;
}

/** Δ% for latest vs baseline (earliest row with this test), sign-normalized so positive = better. */
export function deltaPct(rows: TestRow[], playerId: string, test: TestId): number | null {
  const mine = rows
    .filter((r) => r.playerId === playerId && r.values[test] != null)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (mine.length < 2) return null;
  const def = TEST_DEFS.find((t) => t.id === test)!;
  const base = mine[0].values[test]!;
  const latest = mine[mine.length - 1].values[test]!;
  if (base === 0) return null;
  return Math.round(def.dir * ((latest - base) / base) * 1000) / 10;
}

export function latestValue(rows: TestRow[], playerId: string, test: TestId): { value: number; date: string } | null {
  const mine = rows
    .filter((r) => r.playerId === playerId && r.values[test] != null)
    .sort((a, b) => b.date.localeCompare(a.date));
  return mine.length ? { value: mine[0].values[test]!, date: mine[0].date } : null;
}

export function baselineValue(rows: TestRow[], playerId: string, test: TestId): { value: number; date: string } | null {
  const mine = rows
    .filter((r) => r.playerId === playerId && r.values[test] != null)
    .sort((a, b) => a.date.localeCompare(b.date));
  return mine.length ? { value: mine[0].values[test]!, date: mine[0].date } : null;
}
