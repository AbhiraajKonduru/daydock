import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { authorize } from "./auth";

export const recordPageView = mutation({
  args: {
    secret: v.string(),
    visitorHash: v.string(),
    referrer: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    authorize(args.secret);
    const now = Date.now();
    const recent = await ctx.db
      .query("analyticsEvents")
      .withIndex("by_kind_and_created_at", (query) =>
        query.eq("kind", "page_view").gte("createdAt", now - 30 * 60 * 1000),
      )
      .filter((query) => query.eq(query.field("visitorHash"), args.visitorHash))
      .first();

    if (recent) return recent._id;
    return ctx.db.insert("analyticsEvents", {
      kind: "page_view",
      visitorHash: args.visitorHash,
      referrer: args.referrer,
      createdAt: now,
    });
  },
});

export const recordDownload = mutation({
  args: {
    secret: v.string(),
    visitorHash: v.string(),
    platform: v.union(v.literal("windows"), v.literal("macos"), v.literal("linux")),
    version: v.string(),
  },
  handler: async (ctx, args) => {
    authorize(args.secret);
    return ctx.db.insert("analyticsEvents", {
      kind: "download",
      visitorHash: args.visitorHash,
      platform: args.platform,
      version: args.version,
      createdAt: Date.now(),
    });
  },
});
