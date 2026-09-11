import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { convexServerClient } from "@/lib/convexServer";

export async function GET() {
  try {
    const testimonials = await convexServerClient().query(api.submissions.publishedTestimonials, {});
    return NextResponse.json(testimonials, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" },
    });
  } catch (error) {
    console.error("Could not load testimonials", error);
    return NextResponse.json([]);
  }
}
