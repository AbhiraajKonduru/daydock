import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { authorize } from "./auth";

export const dashboard = query({
  args: { secret: v.string() },
  handler: async (ctx, args) => {
    authorize(args.secret);
    const [events, submissions] = await Promise.all([
      ctx.db.query("analyticsEvents").withIndex("by_created_at").order("desc").take(20000),
      ctx.db.query("submissions").withIndex("by_created_at").order("desc").take(1000),
    ]);

    return { events, submissions };
  },
});

export const updateSubmissionStatus = mutation({
  args: {
    secret: v.string(),
    id: v.id("submissions"),
    status: v.union(
      v.literal("new"),
      v.literal("reviewing"),
      v.literal("planned"),
      v.literal("resolved"),
      v.literal("published"),
      v.literal("rejected"),
    ),
  },
  handler: async (ctx, args) => {
    authorize(args.secret);
    const submission = await ctx.db.get(args.id);
    if (!submission) throw new Error("Submission not found");
    if (args.status === "published" && (!submission.quotePermission || submission.kind !== "testimonial")) {
      throw new Error("Only testimonials with quote permission can be published.");
    }
    await ctx.db.patch(args.id, { status: args.status, updatedAt: Date.now() });
    return { ok: true };
  },
});
