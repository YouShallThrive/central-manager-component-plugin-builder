import { v } from "convex/values";
import { internalQuery, internalMutation } from "./_generated/server";

/**
 * Internal helpers for the WordPress plugin-update endpoints in http.ts.
 * The HTTP routes are public (like wordpress.org's update API): sites poll
 * the manifest and download the package zip.
 */

export const getPluginForUpdate = internalQuery({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const plugin = await ctx.db
      .query("customPlugins")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (!plugin || !plugin.fileStorageId) return null;
    return {
      slug: plugin.slug,
      name: plugin.name,
      version: plugin.version,
      author: plugin.author,
      description: plugin.description,
      changelog: plugin.changelog ?? "",
      fileStorageId: plugin.fileStorageId,
      fileSize: plugin.fileSize ?? 0,
      updatedAt: plugin.updatedAt,
    };
  },
});

export const countDownload = internalMutation({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const plugin = await ctx.db
      .query("customPlugins")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (plugin) {
      await ctx.db.patch(plugin._id, { downloadCount: plugin.downloadCount + 1 });
    }
  },
});
