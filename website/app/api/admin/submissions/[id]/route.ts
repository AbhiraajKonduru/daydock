import { NextRequest, NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { hasValidAdminSession } from "@/lib/adminSession";
import { convexInternalSecret, convexServerClient } from "@/lib/convexServer";

const STATUSES = new Set(["new", "reviewing", "planned", "resolved", "published", "rejected"]);

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!hasValidAdminSession(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await context.params;
    const body = await request.json() as { status?: unknown };
    if (typeof body.status !== "string" || !STATUSES.has(body.status)) {
      return NextResponse.json({ error: "Choose a valid status." }, { status: 400 });
    }
    await convexServerClient().mutation(api.admin.updateSubmissionStatus, {
      secret: convexInternalSecret(),
      id: id as Id<"submissions">,
      status: body.status as "new" | "reviewing" | "planned" | "resolved" | "published" | "rejected",
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Could not update submission", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update submission." }, { status: 500 });
  }
}
