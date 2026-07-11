"use client";

import { useEffect, useState } from "react";

// Walking skeleton home: unlock with PIN, write one test row to Notion, read it back.
// The real entry flow / progress view replace this page in later tickets.

type Latest = { id: string; created: string; properties: Record<string, unknown> } | null;

export default function Home() {
  const [locked, setLocked] = useState<boolean | null>(null);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [latest, setLatest] = useState<Latest>(null);
  const [msg, setMsg] = useState("");

  async function refresh() {
    const res = await fetch("/api/skeleton-test");
    if (res.status === 401) {
      setLocked(true);
      return;
    }
    setLocked(false);
    const data = await res.json();
    setLatest(data.latest ?? null);
    if (data.error) setMsg(data.error);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    const res = await fetch("/api/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    setBusy(false);
    if (res.ok) {
      setPin("");
      refresh();
    } else {
      setMsg("Wrong PIN");
    }
  }

  async function writeTestRow() {
    setBusy(true);
    setMsg("");
    const res = await fetch("/api/skeleton-test", { method: "POST" });
    const data = await res.json();
    setBusy(false);
    setMsg(res.ok ? `Row written: ${data.pageId}` : `Error: ${data.error}`);
    if (res.ok) refresh();
  }

  return (
    <main className="mx-auto max-w-md p-4 pb-24">
      <h1 className="text-xl font-bold">Circuit Tracker</h1>
      <p className="mb-4 text-sm text-neutral-500">Walking skeleton</p>

      {locked === null && <p className="text-neutral-500">Checking lock…</p>}

      {locked === true && (
        <form onSubmit={unlock} className="rounded-2xl border border-neutral-200 bg-white p-4">
          <label className="mb-2 block text-sm text-neutral-500">PIN</label>
          <input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="mb-3 w-full rounded-xl border border-neutral-300 p-3 text-lg"
            autoFocus
          />
          <button
            disabled={busy || pin.length === 0}
            className="w-full rounded-xl bg-blue-700 p-3 font-semibold text-white disabled:opacity-50"
          >
            Unlock
          </button>
        </form>
      )}

      {locked === false && (
        <div className="space-y-3">
          <button
            onClick={writeTestRow}
            disabled={busy}
            className="w-full rounded-xl bg-blue-700 p-3 font-semibold text-white disabled:opacity-50"
          >
            {busy ? "Working…" : "Write test row → Notion"}
          </button>
          <div className="rounded-2xl border border-neutral-200 bg-white p-4">
            <h2 className="mb-2 text-sm font-semibold text-neutral-500">Latest row in Notion</h2>
            {latest ? (
              <pre className="overflow-x-auto text-xs leading-relaxed">
                {JSON.stringify(latest, null, 2)}
              </pre>
            ) : (
              <p className="text-sm text-neutral-500">No rows yet.</p>
            )}
          </div>
        </div>
      )}

      {msg && <p className="mt-3 text-sm text-neutral-600">{msg}</p>}
    </main>
  );
}
