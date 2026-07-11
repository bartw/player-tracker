import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, sha256Hex } from "@/lib/notion";

export async function POST(req: NextRequest) {
  const { pin } = await req.json().catch(() => ({ pin: "" }));
  const expected = process.env.APP_PIN;
  if (!expected) return NextResponse.json({ error: "APP_PIN not configured" }, { status: 500 });
  if (typeof pin !== "string" || pin !== expected) {
    return NextResponse.json({ error: "wrong pin" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, await sha256Hex(expected), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  return res;
}
