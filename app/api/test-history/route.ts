import { NextResponse } from "next/server";
import { fetchPlayers } from "@/lib/sessions";
import { fetchTestRows } from "@/lib/tests-io";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [players, rows] = await Promise.all([fetchPlayers(), fetchTestRows()]);
    return NextResponse.json({ players, rows });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
