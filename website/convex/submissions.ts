import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { authorize } from "./auth";

const submissionKind = v.union(
  v.literal("testimonial"),
  v.literal("bug"),
  v.literal("feature"),
  v.literal("improvement"),
  v.literal("general"),
  v.literal("advisor"),
  v.literal("volunteer"),
);

const displayPreference = v.optional(
  v.union(v.literal("anonymous"), v.literal("first_name"), v.literal("full_name")),
);

export const submit = mutation({
  args: {
    secret: v.string(),
    kind: submissionKind,
    verified: v.boolean(),
    platform: v.optional(v.string()),
    appVersion: v.optional(v.string()),
    verificationGeneratedAt: v.optional(v.number()),
    verificationAlgorithmVersion: v.optional(v.number()),
    title: v.optional(v.string()),
    message: v.optional(v.string()),
    useCase: v.optional(v.string()),
    problem: v.optional(v.string()),
    outcome: v.optional(v.string()),
    recommendation: v.optional(v.string()),
    displayPreference,
    displayName: v.optional(v.string()),
    role: v.optional(v.string()),
    email: v.optional(v.string()),
    linkedinUrl: v.optional(v.string()),
    contact: v.optional(v.string()),
    quotePermission: v.boolean(),
    followUpPermission: v.boolean(),
  },
  handler: async (ctx, args) => {
    authorize(args.secret);
    const now = Date.now();
    const trim = (value: string | undefined, max: number) => value?.trim().slice(0, max) || undefined;
    const verified = args.verified && Boolean(trim(args.platform, 30) && trim(args.appVersion, 40));
    const id = await ctx.db.insert("submissions", {
      kind: args.kind,
      title: trim(args.title, 160),
      message: trim(args.message, 5000),
      useCase: trim(args.useCase, 2000),
      problem: trim(args.problem, 2000),
      outcome: trim(args.outcome, 2000),
      recommendation: trim(args.recommendation, 2000),
      displayPreference: args.displayPreference,
      displayName: trim(args.displayName, 120),
      role: trim(args.role, 160),
      email: trim(args.email, 320),
      linkedinUrl: trim(args.linkedinUrl, 400),
      contact: trim(args.contact, 120),
      quotePermission: args.quotePermission,
      followUpPermission: args.followUpPermission,
      verified,
      platform: trim(args.platform, 30),
      appVersion: trim(args.appVersion, 40),
      verificationGeneratedAt: args.verificationGeneratedAt,
      verificationAlgorithmVersion: args.verificationAlgorithmVersion,
      status: "new",
      createdAt: now,
      updatedAt: now,
    });
    return { id, verified };
  },
});

export const publishedTestimonials = query({
  args: {},
  handler: async (ctx) => {
    const records = await ctx.db
      .query("submissions")
      .withIndex("by_kind_and_status", (query) =>
        query.eq("kind", "testimonial").eq("status", "published"),
      )
      .order("desc")
      .take(6);

    return records
      .filter((record) => record.quotePermission)
      .map((record) => ({
        id: record._id,
        quote: record.recommendation || record.outcome || record.message || "",
        displayName:
          record.displayPreference === "anonymous" ? "Anonymous Daydock user" : record.displayName || "Daydock user",
        role: record.role,
        verified: record.verified,
      }))
      .filter((record) => record.quote);
  },
});
