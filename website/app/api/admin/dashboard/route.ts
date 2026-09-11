import { NextRequest, NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { hasValidAdminSession } from "@/lib/adminSession";
import { convexInternalSecret, convexServerClient } from "@/lib/convexServer";

export async function GET(request: NextRequest) {
  if (!hasValidAdminSession(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const data = await convexServerClient().query(api.admin.dashboard, { secret: convexInternalSecret() });
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Could not load dashboard", error);
    return NextResponse.json({ error: "Could not load dashboard data." }, { status: 500 });
  }
}
