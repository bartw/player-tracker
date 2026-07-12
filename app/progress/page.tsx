"use client";

// Progress view — "B home → A detail" from the progress-view prototype (ticket 05):
// Team board grid (stall detection first), tap a player for their report card.

import { useEffect, useState } from "react";
import { BANDS, PATTERNS, PatternId, SessionRow, canonical, displayNames } from "@/lib/domain";
import { SeriesPoint, latestEntry, playerRows, ranks, series, shortPos, trend } from "@/lib/progress";

interface Player { id: string; name: string }

const fmt = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

const GLYPH = { up: "▲", down: "▼", flat: "▬" } as const;
const GLYPH_CLASS = { up: "text-emerald-700", down: "text-red-700", flat: "text-amber-700" } as const;

export default function ProgressPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [history, setHistory] = useState<SessionRow[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [locked, setLocked] = useState(false);

  async function load() {
    const res = await fetch("/api/history");
    if (res.status === 401) return setLocked(true);
    const data = await res.json();
    if (data.error) return setMsg(data.error);
    setPlayers(data.players);
    setHistory(data.sessions);
  }
  useEffect(() => { load(); }, []);

  if (locked) {
    return (
      <main className="mx-auto max-w-md p-4">
        <p className="text-neutral-500">Locked — unlock on the <a className="text-blue-700" href="/">log page</a> first.</p>
      </main>
    );
  }
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

  const player = players.find((p) => p.id === selected);
  return (
    <main className="mx-auto max-w-md p-4 pb-16">
      <div className="mb-3 flex items-baseline justify-between">
        <h1 className="text-xl font-bold">Progress</h1>
        <span className="space-x-3 text-sm font-medium">
          <a href="/" className="text-blue-700">Log session</a>
          <a href="/tests" className="text-blue-700">Tests</a>
        </span>
      </div>
      {player ? <ReportCard player={player} history={history} onBack={() => setSelected(null)} />
              : <TeamBoard players={players} history={history} onSelect={setSelected} />}
    </main>
  );
}

function TeamBoard({ players, history, onSelect }: {
  players: Player[]; history: SessionRow[]; onSelect: (id: string) => void;
}) {
  return (
    <>
      <p className="mb-2 text-sm text-neutral-500">Latest position + trend vs previous session. Tap a player for their journey.</p>
      <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white p-2">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              <th className="p-1"></th>
              {PATTERNS.map((p) => (
                <th key={p.id} className="p-1 text-left text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                  {p.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {players.map((pl) => {
              const rows = playerRows(history, pl.id);
              return (
                <tr key={pl.id} className="cursor-pointer border-t border-neutral-200 active:bg-neutral-50"
                    onClick={() => onSelect(pl.id)}>
                  <td className="whitespace-nowrap p-1 pr-2 font-semibold">{displayNames(players)[pl.id]}</td>
                  {PATTERNS.map((pat) => {
                    const t = trend(rows, pat.id);
                    return (
                      <td key={pat.id} className="p-1 align-top">
                        <span className={`font-bold ${GLYPH_CLASS[t.glyph]}`}>{GLYPH[t.glyph]}</span>{" "}
                        <span className="text-[11px] text-neutral-500">{shortPos(latestEntry(rows, pat.id))}</span>
                        {t.staticCount >= 3 && (
                          <div><span className="rounded bg-amber-100 px-1 py-0.5 text-[10px] text-amber-800">static ×{t.staticCount}</span></div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-neutral-500">▲ improved last session · ▼ regressed · ▬ unchanged (badge at ≥3 static)</p>
    </>
  );
}

function ReportCard({ player, history, onBack }: {
  player: Player; history: SessionRow[]; onBack: () => void;
}) {
  const rows = playerRows(history, player.id);
  return (
    <>
      <button onClick={onBack} className="mb-2 text-sm font-medium text-blue-700">← Team board</button>
      <h2 className="mb-3 text-lg font-bold">{player.name}</h2>
      {rows.length === 0 && <p className="text-sm text-neutral-500">No sessions yet.</p>}
      {rows.length > 0 && PATTERNS.map((pat) => {
        const pts = series(rows, pat.id);
        const t = trend(rows, pat.id);
        const cur = latestEntry(rows, pat.id);
        const rankInfo = ranks(history, pat.id)[player.id];
        return (
          <div key={pat.id} className="mb-3 rounded-2xl border border-neutral-200 bg-white p-3">
            <div className="mb-1 flex items-baseline gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">{pat.label}</span>
              <span className="text-sm font-bold">{cur ? canonical(cur) : "—"}</span>
              {rankInfo && (
                <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-600">
                  {ordinal(rankInfo.rank)} of {rankInfo.pool}
                </span>
              )}
              <span className={`ml-auto text-xs ${GLYPH_CLASS[t.glyph]}`}>{GLYPH[t.glyph]} {t.label}</span>
            </div>
            <Sparkline points={pts} />
            {pat.id === "vpull" && <BandStrip points={pts} />}
          </div>
        );
      })}
    </>
  );
}

function Sparkline({ points }: { points: SeriesPoint[] }) {
  const W = 340, H = 64, PAD = 8;
  const vals = points.map((p) => p.volume);
  const known = vals.filter((v): v is number => v != null);
  if (known.length === 0) return <p className="text-xs text-neutral-400">no data</p>;
  const max = Math.max(...known), min = Math.min(...known);
  const x = (i: number) => (points.length === 1 ? W / 2 : PAD + (i * (W - 2 * PAD)) / (points.length - 1));
  const y = (v: number) => (max === min ? H / 2 : H - PAD - ((v - min) * (H - 2 * PAD)) / (max - min));
  let path = "";
  vals.forEach((v, i) => {
    if (v == null) return;
    path += !path || vals[i - 1] == null ? `M${x(i)},${y(v)}` : ` L${x(i)},${y(v)}`;
  });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" aria-label="volume (total reps) per session">
      <path d={path} fill="none" stroke="#0b6bcb" strokeWidth="2" strokeLinecap="round" />
      {points.map((p, i) =>
        p.volume == null ? (
          <circle key={i} cx={x(i)} cy={H - PAD} r="2" fill="#d4d4d4"><title>{fmt(p.date)} — absent/skipped</title></circle>
        ) : (
          <g key={i}>
            <circle cx={x(i)} cy={y(p.volume)} r="3" fill="#0b6bcb">
              <title>{`${fmt(p.date)} — ${canonical(p.entry!)} (${p.volume} reps)`}</title>
            </circle>
            {p.changeLabel && (
              <>
                <circle cx={x(i)} cy={y(p.volume)} r="6.5" fill="none" stroke="#0b6bcb" strokeWidth="2" />
                <text x={x(i)} y={Math.max(9, y(p.volume) - 10)} fontSize="8.5" fill="#697077" textAnchor="middle">
                  {p.changeLabel.split(" ")[0]}
                </text>
              </>
            )}
          </g>
        ),
      )}
    </svg>
  );
}

const BAND_COLOR: Record<string, string> = { black: "#1a1d21", yellow: "#c9a400", blue: "#0b6bcb", none: "#1a7f37" };

function BandStrip({ points }: { points: SeriesPoint[] }) {
  return (
    <>
      <div className="mt-1 flex gap-0.5">
        {points.map((p, i) => {
          const band = p.entry?.kind === "pullup" ? p.entry.band : null;
          return (
            <i key={i} title={`${fmt(p.date)}${band ? ` — ${band}` : " — absent/skipped"}`}
               className="h-1.5 flex-1 rounded-full"
               style={{ background: band ? BAND_COLOR[band] : "#e2e5e9" }} />
          );
        })}
      </div>
      <p className="mt-1 text-[11px] text-neutral-500">
        band per session: {BANDS.join(" → ")} (less assist is better)
      </p>
    </>
  );
}
