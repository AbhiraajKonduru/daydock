import { NextRequest, NextResponse } from "next/server";
import { attachAdminSession, passwordMatches } from "@/lib/adminSession";

const attempts = new Map<string, { count: number; resetAt: number }>();

export async function POST(request: NextRequest) {
  const key = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  const current = attempts.get(key);
  if (current && current.resetAt > now && current.count >= 8) {
    return NextResponse.json({ error: "Too many attempts. Try again in 15 minutes." }, { status: 429 });
  }

  try {
    const body = await request.json() as { password?: unknown };
    if (typeof body.password !== "string" || !passwordMatches(body.password)) {
      attempts.set(key, {
        count: current && current.resetAt > now ? current.count + 1 : 1,
        resetAt: current && current.resetAt > now ? current.resetAt : now + 15 * 60 * 1000,
      });
      return NextResponse.json({ error: "That password is not correct." }, { status: 401 });
    }
    attempts.delete(key);
    const response = NextResponse.json({ ok: true });
    attachAdminSession(response);
    return response;
  } catch (error) {
    console.error("Admin login failed", error);
    return NextResponse.json({ error: "The dashboard is not configured yet." }, { status: 500 });
  }
}
