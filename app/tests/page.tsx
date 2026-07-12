"use client";

// Tests page — separate from strength results by explicit requirement.
// Shapes from the tests-page prototype (test-tracker ticket 02):
// view = team Δ% table home → player card detail; entry = station-style test day.

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { isUnauthenticated } from "@/lib/auth-fetch";
import { displayNames } from "@/lib/domain";
import {
  TEST_DEFS, TestId, TestRow, TestValues, baselineValue, deltaPct, latestValue,
} from "@/lib/tests";

interface Player { id: string; name: string }

const today = () => new Date().toISOString().slice(0, 10);
const fmt = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
const shortLabel = (label: string) => label.replace(/ \(.+\)$/, "");

function DeltaBadge({ pct }: { pct: number | null }) {
  if (pct == null) return null;
  const cls = pct > 0 ? "bg-emerald-100 text-emerald-800" : pct < 0 ? "bg-red-100 text-red-800" : "bg-neutral-100 text-neutral-500";
  return <span className={`inline-block rounded px-1 text-[10px] font-bold ${cls}`}>{pct > 0 ? "+" : ""}{pct}%</span>;
}

export default function TestsPage() {
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]);
  const [rows, setRows] = useState<TestRow[]>([]);
  const [msg, setMsg] = useState("");
  const [mode, setMode] = useState<"view" | "entry">("view");
  const [selected, setSelected] = useState<string | null>(null); // playerId for card detail
  // entry state
  const [date, setDate] = useState(today());
  const [test, setTest] = useState<TestId>("sprint");
  const [typed, setTyped] = useState<Record<string, Partial<Record<TestId, string>>>>({});
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch("/api/test-history");
    if (isUnauthenticated(res.status)) return router.replace("/sign-in");
    const data = await res.json();
    if (data.error) return setMsg(data.error);
    setPlayers(data.players);
    setRows(data.rows);
  }
  useEffect(() => { load(); }, []);

  const names = useMemo(() => displayNames(players), [players]);

  async function save() {
    setBusy(true);
    setMsg("");
    const entries = players.map((p) => {
      const values: TestValues = {};
      for (const def of TEST_DEFS) {
        const raw = typed[p.id]?.[def.id];
        if (raw != null && raw !== "" && !Number.isNaN(Number(raw))) values[def.id] = Number(raw);
      }
      return { playerId: p.id, playerName: p.name, values };
    }).filter((e) => Object.keys(e.values).length > 0);
    const res = await fetch("/api/log-tests", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, entries }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setMsg(`Save failed: ${data.error} — retry is safe.`); return; }
    setMsg(`Saved ✓ (${Object.keys(data.results).length} players)`);
    setTyped({});
    load();
  }

  const typedCount = players.reduce(
    (n, p) => n + TEST_DEFS.filter((d) => (typed[p.id]?.[d.id] ?? "") !== "").length, 0);

  if (players.length === 0) {
    return (
      <main className="mx-auto max-w-md p-4">
        <p className="text-neutral-500">{msg ? `Couldn't reach Notion: ${msg}` : "Loading…"}</p>
        {msg && (
          <button onClick={() => { setMsg(""); load(); }}
            className="mt-3 w-full rounded-xl bg-blue-700 p-3 font-semibold text-white">Retry</button>
        )}
      </main>
    );
  }

  const def = TEST_DEFS.find((d) => d.id === test)!;
  const player = players.find((p) => p.id === selected);

  return (
    <main className="mx-auto max-w-md p-4 pb-16">
      <div className="mb-3 flex items-baseline justify-between">
        <h1 className="text-xl font-bold">Tests</h1>
        <span className="space-x-3 text-sm font-medium">
          <a href="/" className="text-blue-700">Log session</a>
          <a href="/progress" className="text-blue-700">Progress</a>
        </span>
      </div>

      <div className="mb-3 flex gap-2">
        <button onClick={() => setMode("view")}
          className={`flex-1 rounded-xl p-2 text-sm font-semibold ${mode === "view" ? "bg-neutral-900 text-white" : "border border-neutral-300 bg-white"}`}>
          Progress
        </button>
        <button onClick={() => setMode("entry")}
          className={`flex-1 rounded-xl p-2 text-sm font-semibold ${mode === "entry" ? "bg-neutral-900 text-white" : "border border-neutral-300 bg-white"}`}>
          Test day
        </button>
      </div>

      {mode === "view" && !player && (
        <>
          <p className="mb-2 text-sm text-neutral-500">Latest value + Δ% vs own baseline. Green is better (sprint/T-test: faster). Tap a player.</p>
          <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white p-2">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr><th className="p-1"></th>
                  {TEST_DEFS.map((d) => (
                    <th key={d.id} className="p-1 text-right text-[9px] font-semibold uppercase tracking-wide text-neutral-500">{shortLabel(d.label)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {players.map((p) => (
                  <tr key={p.id} className="cursor-pointer border-t border-neutral-200 active:bg-neutral-50" onClick={() => setSelected(p.id)}>
                    <td className="whitespace-nowrap p-1 pr-2 text-left font-semibold">{names[p.id]}</td>
                    {TEST_DEFS.map((d) => {
                      const l = latestValue(rows, p.id, d.id);
                      return (
                        <td key={d.id} className="p-1 text-right align-top tabular-nums">
                          {l ? <>{l.value}<br /><DeltaBadge pct={deltaPct(rows, p.id, d.id)} /></> : <span className="text-neutral-400">—</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {mode === "view" && player && (
        <>
          <button onClick={() => setSelected(null)} className="mb-2 text-sm font-medium text-blue-700">← Team table</button>
          <h2 className="mb-3 text-lg font-bold">{player.name}</h2>
          <div className="rounded-2xl border border-neutral-200 bg-white p-3">
            {TEST_DEFS.map((d) => {
              const b = baselineValue(rows, player.id, d.id);
              const l = latestValue(rows, player.id, d.id);
              return (
                <div key={d.id} className="flex items-baseline gap-2 border-t border-neutral-200 py-2.5 first:border-t-0">
                  <span className="w-24 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">{shortLabel(d.label)}</span>
                  {l ? (
                    <span className="text-sm text-neutral-500">
                      {b && b.date !== l.date
                        ? <>{b.value}{d.unit} → <b className="text-base text-neutral-900">{l.value}{d.unit}</b></>
                        : <><b className="text-base text-neutral-900">{l.value}{d.unit}</b> <span className="text-[11px]">({fmt(l.date)}, baseline)</span></>}
                    </span>
                  ) : <span className="text-sm text-neutral-400">no data</span>}
                  <span className="ml-auto"><DeltaBadge pct={deltaPct(rows, player.id, d.id)} /></span>
                </div>
              );
            })}
          </div>
        </>
      )}

      {mode === "entry" && (
        <>
          <div className="mb-3 flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white p-3">
            <label className="text-sm text-neutral-500">Test day</label>
            <input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} className="rounded-lg font-semibold" />
            {date !== today() && <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">backfill</span>}
          </div>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {TEST_DEFS.map((d) => (
              <button key={d.id} onClick={() => setTest(d.id)}
                className={`rounded-full border px-3 py-1.5 text-[13px] ${test === d.id ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300 bg-white"}`}>
                {shortLabel(d.label)}
              </button>
            ))}
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-white px-3">
            {players.map((p) => {
              const last = latestValue(rows, p.id, test);
              return (
                <div key={p.id} className="flex items-center gap-2 border-t border-neutral-200 py-2 first:border-t-0">
                  <span className="w-20 shrink-0 text-sm font-semibold">{names[p.id]}</span>
                  <span className="w-20 shrink-0 text-right text-[11px] text-neutral-500">{last ? `last ${last.value}${def.unit}` : "no data"}</span>
                  <input type="number" inputMode="decimal" step={def.step} placeholder="—"
                    value={typed[p.id]?.[test] ?? ""}
                    onChange={(e) => setTyped((t) => ({ ...t, [p.id]: { ...t[p.id], [test]: e.target.value } }))}
                    className="ml-auto w-24 rounded-xl border border-neutral-300 bg-neutral-50 p-2 text-right text-base font-semibold" />
                  <span className="w-7 text-xs text-neutral-500">{def.unit}</span>
                </div>
              );
            })}
          </div>
          <button onClick={save} disabled={busy || typedCount === 0}
            className="mt-4 w-full rounded-xl bg-blue-700 p-3 font-semibold text-white disabled:opacity-50">
            {busy ? "Saving…" : `Save test day (${typedCount} values)`}
          </button>
          <p className="mt-1 text-xs text-neutral-500">Blank = not tested. Saving merges into the day's existing rows, so you can save station by station.</p>
        </>
      )}

      {msg && <p className="mt-3 text-sm text-neutral-600">{msg}</p>}
    </main>
  );
}
