import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  analyticsEvents: defineTable({
    kind: v.union(v.literal("page_view"), v.literal("download")),
    visitorHash: v.string(),
    platform: v.optional(v.union(v.literal("windows"), v.literal("macos"), v.literal("linux"))),
    version: v.optional(v.string()),
    referrer: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_created_at", ["createdAt"])
    .index("by_kind_and_created_at", ["kind", "createdAt"]),

  submissions: defineTable({
    kind: v.union(
      v.literal("testimonial"),
      v.literal("bug"),
      v.literal("feature"),
      v.literal("improvement"),
      v.literal("general"),
      v.literal("advisor"),
      v.literal("volunteer"),
    ),
    title: v.optional(v.string()),
    message: v.optional(v.string()),
    useCase: v.optional(v.string()),
    problem: v.optional(v.string()),
    outcome: v.optional(v.string()),
    recommendation: v.optional(v.string()),
    displayPreference: v.optional(
      v.union(v.literal("anonymous"), v.literal("first_name"), v.literal("full_name")),
    ),
    displayName: v.optional(v.string()),
    role: v.optional(v.string()),
    email: v.optional(v.string()),
    linkedinUrl: v.optional(v.string()),
    contact: v.optional(v.string()),
    quotePermission: v.boolean(),
    followUpPermission: v.boolean(),
    verified: v.boolean(),
    platform: v.optional(v.string()),
    appVersion: v.optional(v.string()),
    verificationGeneratedAt: v.optional(v.number()),
    verificationAlgorithmVersion: v.optional(v.number()),
    status: v.union(
      v.literal("new"),
      v.literal("reviewing"),
      v.literal("planned"),
      v.literal("resolved"),
      v.literal("published"),
      v.literal("rejected"),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_created_at", ["createdAt"])
    .index("by_kind_and_status", ["kind", "status"]),
});
