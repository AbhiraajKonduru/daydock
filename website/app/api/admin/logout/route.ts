import { NextResponse } from "next/server";
import { clearAdminSession } from "@/lib/adminSession";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  clearAdminSession(response);
  return response;
}
