import { NextRequest, NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { convexInternalSecret, convexServerClient } from "@/lib/convexServer";

const KINDS = new Set(["testimonial", "bug", "feature", "improvement", "general", "advisor", "volunteer"]);
const DISPLAY_PREFERENCES = new Set(["anonymous", "first_name", "full_name"]);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>;
    if (body.website) return NextResponse.json({ ok: true });
    if (typeof body.kind !== "string" || !KINDS.has(body.kind)) {
      return NextResponse.json({ error: "Choose a feedback type." }, { status: 400 });
    }

    const string = (key: string) => typeof body[key] === "string" ? body[key] as string : undefined;
    const bool = (key: string) => body[key] === true;
    const kind = body.kind as
      | "testimonial" | "bug" | "feature" | "improvement" | "general" | "advisor" | "volunteer";
    if (kind === "testimonial") {
      const story = [string("useCase"), string("problem"), string("outcome"), string("recommendation"), string("message")]
        .some((value) => value?.trim());
      if (!story) return NextResponse.json({ error: "Tell us a little about how you use Daydock." }, { status: 400 });
    } else if (kind === "advisor" || kind === "volunteer") {
      if (!string("displayName")?.trim()) {
        return NextResponse.json({ error: "Please include your name." }, { status: 400 });
      }
      if (!string("email")?.trim()) {
        return NextResponse.json({ error: "Please include an email so we can reach you." }, { status: 400 });
      }
      if (kind === "advisor" && !string("linkedinUrl")?.trim()) {
        return NextResponse.json({ error: "Please include your LinkedIn profile." }, { status: 400 });
      }
    } else if (!string("message")?.trim()) {
      return NextResponse.json({ error: "Please include a short message." }, { status: 400 });
    }
    const result = await convexServerClient().mutation(api.submissions.submit, {
      secret: convexInternalSecret(),
      kind,
      title: string("title"),
      message: string("message"),
      useCase: string("useCase"),
      problem: string("problem"),
      outcome: string("outcome"),
      recommendation: string("recommendation"),
      displayPreference:
        typeof body.displayPreference === "string" && DISPLAY_PREFERENCES.has(body.displayPreference)
          ? body.displayPreference as "anonymous" | "first_name" | "full_name"
          : undefined,
      displayName: string("displayName"),
      role: string("role"),
      email: string("email"),
      linkedinUrl: string("linkedinUrl"),
      contact: string("contact"),
      quotePermission: bool("quotePermission"),
      followUpPermission: bool("followUpPermission"),
      verified: bool("verified"),
      platform: string("platform"),
      appVersion: string("appVersion"),
      verificationGeneratedAt:
        typeof body.verificationGeneratedAt === "number" ? body.verificationGeneratedAt : undefined,
      verificationAlgorithmVersion:
        typeof body.verificationAlgorithmVersion === "number" ? body.verificationAlgorithmVersion : undefined,
    });
    return NextResponse.json({ ok: true, id: result.id, verified: result.verified });
  } catch (error) {
    console.error("Could not save submission", error);
    return NextResponse.json({ error: "We could not save that right now. Please try again." }, { status: 500 });
  }
}
