import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, env, sha256Hex } from "@/lib/notion";
import { fetchPlayers, fetchSessions } from "@/lib/sessions";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // Defense in depth: middleware already checks, handlers re-check.
    if (req.cookies.get(AUTH_COOKIE)?.value !== (await sha256Hex(env("APP_PIN")))) {
      return NextResponse.json({ error: "locked" }, { status: 401 });
    }
    const [players, sessions] = await Promise.all([fetchPlayers(), fetchSessions()]);
    return NextResponse.json({ players, sessions });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
