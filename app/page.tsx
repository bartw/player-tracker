"use client";

// After-session entry flow — the "Confirm sheet" shape that won the entry-UI prototype
// (.scratch/circuit-tracker-pwa/issues/04-entry-ui-prototype.md).

import { useEffect, useMemo, useState } from "react";
import {
  BANDS, Band, DEFAULT_ENTRY, LadderEntry, PATTERNS, PatternEntry, PatternId, PatternMap,
  SessionRow, canonical, displayNames, entriesEqual, prefillPatterns, staticStreak,
} from "@/lib/domain";

interface Player { id: string; name: string }
type Draft = {
  absent: boolean;
  patterns: PatternMap;
  skip: Partial<Record<PatternId, boolean>>; // injured / can't perform today → no cell written
  notes: string;
  hasHistory: boolean;
};

const today = () => new Date().toISOString().slice(0, 10);
const clone = <T,>(o: T): T => JSON.parse(JSON.stringify(o));

export default function EntryPage() {
  const [locked, setLocked] = useState<boolean | null>(null);
  const [pin, setPin] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [history, setHistory] = useState<SessionRow[]>([]);
  const [date, setDate] = useState(today());
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [dirty, setDirty] = useState(false);
  const [sheet, setSheet] = useState<string | null>(null); // playerId being edited
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function load() {
    const res = await fetch("/api/history");
    if (res.status === 401) return setLocked(true);
    const data = await res.json();
    if (data.error) return setMsg(data.error);
    setLocked(false);
    setPlayers(data.players);
    setHistory(data.sessions);
  }
  useEffect(() => { load(); }, []);

  // Rebuild drafts whenever the roster, history, or date changes.
  useEffect(() => {
    const next: Record<string, Draft> = {};
    for (const p of players) {
      const existing = history.find((r) => r.playerId === p.id && r.date === date);
      const reachBack = prefillPatterns(history, p.id, date);
      const wasAbsent = existing?.absent ?? false;
      const patterns = clone(!wasAbsent && existing ? existing.patterns : reachBack);
      const skip: Draft["skip"] = {};
      for (const pat of PATTERNS) {
        // A pattern missing from an existing (non-absent) row was skipped that day; keep the
        // toggle on but fill the controls from reach-back in case it gets unskipped.
        if (existing && !wasAbsent && !patterns[pat.id]) skip[pat.id] = true;
        if (!patterns[pat.id]) patterns[pat.id] = clone(reachBack[pat.id] ?? DEFAULT_ENTRY[pat.id]);
      }
      next[p.id] = {
        absent: wasAbsent,
        patterns,
        skip,
        notes: existing?.notes ?? "",
        hasHistory: !!existing || Object.keys(reachBack).length > 0,
      };
    }
    setDrafts(next);
    setDirty(false);
  }, [players, history, date]);

  const baseline = useMemo(() => {
    const b: Record<string, PatternMap> = {};
    for (const p of players) {
      const prev = history.find((r) => r.playerId === p.id && r.date < date);
      b[p.id] = prev?.patterns ?? {};
    }
    return b;
  }, [players, history, date]);

  function changedPatterns(pid: string): PatternId[] {
    const d = drafts[pid];
    if (!d) return [];
    return PATTERNS.filter((pat) => {
      const draftEntry = d.skip[pat.id] ? undefined : d.patterns[pat.id];
      return !entriesEqual(draftEntry, baseline[pid]?.[pat.id]);
    }).map((p) => p.id);
  }

  function setEntry(pid: string, pat: PatternId, e: PatternEntry) {
    setDirty(true);
    setDrafts((d) => ({ ...d, [pid]: { ...d[pid], patterns: { ...d[pid].patterns, [pat]: e } } }));
  }

  function toggleSkip(pid: string, pat: PatternId) {
    setDirty(true);
    setDrafts((d) => ({ ...d, [pid]: { ...d[pid], skip: { ...d[pid].skip, [pat]: !d[pid].skip[pat] } } }));
  }

  function changeDate(next: string) {
    if (next === date) return;
    if (dirty && !window.confirm("You have unsaved changes for this session. Switch date and lose them?")) return;
    setDate(next);
  }

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg("");
    const res = await fetch("/api/unlock", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin }),
    });
    setBusy(false);
    if (res.ok) { setPin(""); setLocked(null); load(); } else setMsg("Wrong PIN");
  }

  async function save() {
    setBusy(true); setMsg("");
    const entries = players.map((p) => {
      const d = drafts[p.id];
      const patterns: PatternMap = {};
      for (const pat of PATTERNS) if (!d.skip[pat.id]) patterns[pat.id] = d.patterns[pat.id];
      return { playerId: p.id, playerName: p.name, absent: d.absent, patterns, notes: d.notes };
    });
    const res = await fetch("/api/log-session", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date, entries }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setMsg(`Save failed: ${data.error} — nothing is lost, retry is safe.`); return; }
    setPreview(false);
    setMsg(`Saved ✓ (${Object.values(data.results).filter((r) => r !== "skipped").length} rows)`);
    load();
  }

  if (locked === true) {
    return (
      <main className="mx-auto max-w-md p-4">
        <h1 className="mb-4 text-xl font-bold">Circuit Tracker</h1>
        <form onSubmit={unlock} className="rounded-2xl border border-neutral-200 bg-white p-4">
          <label className="mb-2 block text-sm text-neutral-500">PIN</label>
          <input type="password" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value)}
            className="mb-3 w-full rounded-xl border border-neutral-300 p-3 text-lg" autoFocus />
          <button disabled={busy || !pin} className="w-full rounded-xl bg-blue-700 p-3 font-semibold text-white disabled:opacity-50">
            Unlock
          </button>
          {msg && <p className="mt-2 text-sm text-red-600">{msg}</p>}
        </form>
      </main>
    );
  }
  if (locked === null || players.length === 0) {
    return (
      <main className="mx-auto max-w-md p-4">
        <p className="text-neutral-500">{msg ? `Couldn't reach Notion: ${msg}` : "Loading…"}</p>
        {msg && (
          <button onClick={() => { setMsg(""); load(); }}
            className="mt-3 w-full rounded-xl bg-blue-700 p-3 font-semibold text-white">
            Retry
          </button>
        )}
      </main>
    );
  }

  const isBackfill = date !== today();
  const sheetPlayer = players.find((p) => p.id === sheet);

  return (
    <main className="mx-auto max-w-md p-4 pb-28">
      <div className="mb-3 flex items-baseline justify-between">
        <h1 className="text-xl font-bold">Log session</h1>
        <span className="space-x-3 text-sm font-medium">
          <a href="/progress" className="text-blue-700">Progress</a>
          <a href="/tests" className="text-blue-700">Tests</a>
        </span>
      </div>

      <div className="mb-3 flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white p-3">
        <label className="text-sm text-neutral-500">Session</label>
        <input type="date" value={date} max={today()} onChange={(e) => changeDate(e.target.value)}
          className="rounded-lg font-semibold" />
        {isBackfill && <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">backfill</span>}
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white">
        {players.map((p, i) => {
          const d = drafts[p.id];
          if (!d) return null;
          const changed = changedPatterns(p.id);
          return (
            <button key={p.id} onClick={() => setSheet(p.id)}
              className={`flex w-full items-center gap-2 p-3 text-left ${i > 0 ? "border-t border-neutral-200" : ""}`}>
              <span className="w-20 shrink-0 font-semibold">{displayNames(players)[p.id]}</span>
              <span className="min-w-0 flex-1 truncate text-sm text-neutral-500">
                {d.absent ? "absent — recorded without exercises"
                  : changed.length > 0 ? changed.map((id) => {
                      const label = PATTERNS.find((x) => x.id === id)!.label;
                      return d.skip[id] ? `${label} skipped` : label;
                    }).join(" · ")
                  : !d.hasHistory ? "first entry — starting positions"
                  : "carries last session forward"}
              </span>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
                d.absent ? "bg-amber-100 text-amber-800"
                : !d.hasHistory ? "bg-emerald-100 text-emerald-800"
                : changed.length ? "bg-blue-100 text-blue-800" : "bg-neutral-100 text-neutral-500"}`}>
                {d.absent ? "absent" : !d.hasHistory ? "new" : changed.length ? "edited" : "same"}
              </span>
            </button>
          );
        })}
      </div>

      <button onClick={() => setPreview(true)} disabled={busy}
        className="mt-4 w-full rounded-xl bg-blue-700 p-3 font-semibold text-white disabled:opacity-50">
        Review &amp; save
      </button>
      {msg && <p className="mt-2 text-sm text-neutral-600">{msg}</p>}

      {/* bottom sheet editor */}
      {sheetPlayer && drafts[sheetPlayer.id] && (
        <>
          <div className="fixed inset-0 z-40 bg-black/35" onClick={() => setSheet(null)} />
          <div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[85vh] max-w-md overflow-auto rounded-t-2xl bg-white p-4">
            <div className="mb-2 flex items-center">
              <h2 className="text-lg font-bold">{sheetPlayer.name}</h2>
              <label className="ml-auto flex items-center gap-2 text-sm text-neutral-500">
                <input type="checkbox" checked={drafts[sheetPlayer.id].absent}
                  onChange={(e) => { setDirty(true); setDrafts((d) => ({ ...d, [sheetPlayer.id]: { ...d[sheetPlayer.id], absent: e.target.checked } })); }} />
                absent
              </label>
            </div>
            <div className={drafts[sheetPlayer.id].absent ? "pointer-events-none opacity-30" : ""}>
              {PATTERNS.map((pat) => (
                <PatternEditor key={pat.id} patternId={pat.id} entry={drafts[sheetPlayer.id].patterns[pat.id]!}
                  streak={staticStreak(history.filter((r) => r.date < date), sheetPlayer.id, pat.id)}
                  changed={!entriesEqual(drafts[sheetPlayer.id].patterns[pat.id], baseline[sheetPlayer.id]?.[pat.id])}
                  skipped={!!drafts[sheetPlayer.id].skip[pat.id]}
                  onToggleSkip={() => toggleSkip(sheetPlayer.id, pat.id)}
                  onChange={(e) => setEntry(sheetPlayer.id, pat.id, e)} />
              ))}
              <label className="mt-3 block text-xs uppercase tracking-wide text-neutral-500">Notes</label>
              <input value={drafts[sheetPlayer.id].notes}
                onChange={(e) => { setDirty(true); setDrafts((d) => ({ ...d, [sheetPlayer.id]: { ...d[sheetPlayer.id], notes: e.target.value } })); }}
                className="mt-1 w-full rounded-xl border border-neutral-300 p-2" placeholder="optional" />
            </div>
            <button onClick={() => setSheet(null)} className="mt-4 w-full rounded-xl bg-blue-700 p-3 font-semibold text-white">
              Done
            </button>
          </div>
        </>
      )}

      {/* save preview: the exact strings that go to Notion */}
      {preview && (
        <>
          <div className="fixed inset-0 z-40 bg-black/35" onClick={() => setPreview(false)} />
          <div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[85vh] max-w-md overflow-auto rounded-t-2xl bg-white p-4">
            <h2 className="mb-1 text-lg font-bold">Write to Notion — {date}</h2>
            <p className="mb-3 text-sm text-neutral-500">
              {players.length} rows
              {players.some((p) => drafts[p.id].absent) &&
                ` · absent (recorded): ${players.filter((p) => drafts[p.id].absent).map((p) => displayNames(players)[p.id]).join(", ")}`}
            </p>
            {players.map((p) => (
              <div key={p.id} className="mb-3 rounded-xl bg-neutral-50 p-3">
                <div className="mb-1 font-semibold">{p.name}</div>
                {drafts[p.id].absent ? (
                  <div className="font-mono text-xs italic text-neutral-400">absent — row saved with no exercises</div>
                ) : (
                  PATTERNS.map((pat) => (
                    <div key={pat.id} className="flex gap-2 font-mono text-xs leading-relaxed">
                      <span className="w-16 shrink-0 text-neutral-400">{pat.label}</span>
                      <span className={drafts[p.id].skip[pat.id] ? "italic text-neutral-400" : ""}>
                        {drafts[p.id].skip[pat.id] ? "— skipped" : canonical(drafts[p.id].patterns[pat.id]!)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            ))}
            <button onClick={save} disabled={busy}
              className="w-full rounded-xl bg-blue-700 p-3 font-semibold text-white disabled:opacity-50">
              {busy ? "Writing…" : "Save session"}
            </button>
          </div>
        </>
      )}
    </main>
  );
}

function Stepper({ value, onChange, min = 0, suffix }: { value: number; onChange: (v: number) => void; min?: number; suffix?: string }) {
  return (
    <span className="inline-flex items-center rounded-lg border border-neutral-300 bg-neutral-50">
      <button type="button" className="px-2.5 py-1 text-lg text-blue-700" onClick={() => onChange(Math.max(min, value - 1))}>−</button>
      <span className="min-w-8 text-center text-sm font-semibold tabular-nums">{value}{suffix}</span>
      <button type="button" className="px-2.5 py-1 text-lg text-blue-700" onClick={() => onChange(value + 1)}>+</button>
    </span>
  );
}

function PatternEditor({ patternId, entry, streak, changed, skipped, onToggleSkip, onChange }: {
  patternId: PatternId; entry: PatternEntry; streak: number; changed: boolean;
  skipped: boolean; onToggleSkip: () => void; onChange: (e: PatternEntry) => void;
}) {
  const def = PATTERNS.find((p) => p.id === patternId)!;
  return (
    <div className="border-t border-neutral-200 py-2.5 first:border-t-0">
      <div className="mb-1.5 flex items-center text-xs uppercase tracking-wide text-neutral-500">
        {def.label}
        <button type="button" onClick={onToggleSkip}
          className={`ml-auto rounded-full border px-2 py-0.5 text-[11px] normal-case tracking-normal ${
            skipped ? "border-amber-300 bg-amber-100 text-amber-800" : "border-neutral-300 text-neutral-400"}`}>
          {skipped ? "skipped — tap to include" : "skip (injury)"}
        </button>
      </div>
      {skipped ? null : entry.kind === "pullup" ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {entry.reps.map((r, i) => (
            <Stepper key={i} value={r} onChange={(v) => {
              const reps = [...entry.reps] as [number, number, number];
              reps[i] = v;
              onChange({ ...entry, reps });
            }} />
          ))}
          <span className="mx-0.5 text-xs text-neutral-400">band</span>
          {BANDS.map((b) => (
            <button key={b} type="button" onClick={() => onChange({ ...entry, band: b as Band })}
              className={`rounded-full border px-2.5 py-1 text-xs ${entry.band === b
                ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300 bg-neutral-50"}`}>
              {b}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-1.5">
          <select value={entry.variant} onChange={(e) => onChange({ ...entry, variant: e.target.value })}
            className="max-w-44 rounded-lg border border-neutral-300 bg-neutral-50 py-1.5 pl-2 text-sm">
            {[...new Set([...def.ladder, entry.variant])].map((v) => <option key={v}>{v}</option>)}
          </select>
          <Stepper value={entry.sets} min={1} onChange={(v) => onChange({ ...entry, sets: v })} />
          <span className="text-neutral-400">×</span>
          <Stepper value={entry.reps} min={1} onChange={(v) => onChange({ ...entry, reps: v })} />
          {def.kg && <Stepper value={(entry as LadderEntry).kg ?? 0} suffix="kg" onChange={(v) => onChange({ ...entry, kg: v || undefined })} />}
        </div>
      )}
      {streak >= 3 && !changed && !skipped && (
        <div className="mt-1.5 rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-800">
          💡 Unchanged for {streak} sessions — time to progress?
        </div>
      )}
    </div>
  );
}
