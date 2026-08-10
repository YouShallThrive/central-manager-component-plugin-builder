import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/** List all custom plugins */
export const list = query({
  args: {
    category: v.optional(v.union(
      v.literal("starter"),
      v.literal("utility"),
      v.literal("integration"),
      v.literal("custom"),
    )),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    if (args.category) {
      return await ctx.db
        .query("customPlugins")
        .withIndex("by_category", (q) => q.eq("category", args.category!))
        .collect();
    }

    return await ctx.db.query("customPlugins").collect();
  },
});

/** Get a single custom plugin */
export const get = query({
  args: { id: v.id("customPlugins") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return await ctx.db.get(args.id);
  },
});

/** Get the starter plugin */
export const getStarter = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return await ctx.db
      .query("customPlugins")
      .withIndex("by_is_starter", (q) => q.eq("isStarter", true))
      .first();
  },
});

/** Create or update a custom plugin */
export const upsert = mutation({
  args: {
    slug: v.string(),
    name: v.string(),
    description: v.string(),
    version: v.string(),
    author: v.string(),
    category: v.union(
      v.literal("starter"),
      v.literal("utility"),
      v.literal("integration"),
      v.literal("custom"),
    ),
    readme: v.optional(v.string()),
    changelog: v.optional(v.string()),
    fileStorageId: v.optional(v.id("_storage")),
    fileSize: v.optional(v.number()),
    isStarter: v.boolean(),
    createdBy: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    gitRepo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("customPlugins")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("customPlugins", {
      ...args,
      downloadCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

/** Increment download count */
export const incrementDownloads = mutation({
  args: { id: v.id("customPlugins") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const plugin = await ctx.db.get(args.id);
    if (!plugin) throw new Error("Plugin not found");

    await ctx.db.patch(args.id, {
      downloadCount: plugin.downloadCount + 1,
    });
  },
});

/** Delete a custom plugin */
export const remove = mutation({
  args: { id: v.id("customPlugins") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    await ctx.db.delete(args.id);
  },
});

/** Get file download URL */
export const getDownloadUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return await ctx.storage.getUrl(args.storageId);
  },
});

/** Generate upload URL */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    return await ctx.storage.generateUploadUrl();
  },
});

