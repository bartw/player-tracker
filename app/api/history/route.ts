import { NextResponse } from "next/server";
import { fetchPlayers, fetchSessions } from "@/lib/sessions";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [players, sessions] = await Promise.all([fetchPlayers(), fetchSessions()]);
    return NextResponse.json({ players, sessions });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
