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

/** Delete a custom plugin and every stored version */
export const remove = mutation({
  args: { id: v.id("customPlugins") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const plugin = await ctx.db.get(args.id);
    if (!plugin) return;

    const versions = await ctx.db
      .query("pluginVersions")
      .withIndex("by_plugin", (q) => q.eq("pluginId", args.id))
      .collect();
    const stored = new Set<string>();
    for (const version of versions) {
      stored.add(version.fileStorageId);
      await ctx.storage.delete(version.fileStorageId);
      await ctx.db.delete(version._id);
    }
    if (plugin.fileStorageId && !stored.has(plugin.fileStorageId)) {
      await ctx.storage.delete(plugin.fileStorageId);
    }
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

