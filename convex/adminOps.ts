import { action, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

declare const process: { env: Record<string, string | undefined> };

/**
 * Admin ops for Viktor (agent) maintenance of the plugin repository.
 * uploadPluginZip is a public action guarded by the platform-managed
 * VIKTOR_SPACES_PROJECT_SECRET (only Viktor's sandbox knows it), so it
 * can be invoked on BOTH dev and prod deployments.
 */

export const uploadPluginZip = action({
  args: {
    projectSecret: v.string(),
    slug: v.string(),
    base64: v.string(),
    version: v.string(),
    changelogEntry: v.string(),
    readme: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (
      !process.env.VIKTOR_SPACES_PROJECT_SECRET ||
      args.projectSecret !== process.env.VIKTOR_SPACES_PROJECT_SECRET
    ) {
      throw new Error("Unauthorized");
    }
    const bytes = Uint8Array.from(atob(args.base64), (c) => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: "application/zip" });
    const storageId = await ctx.storage.store(blob);
    await ctx.runMutation(internal.adminOps.applyPluginUpdate, {
      slug: args.slug,
      storageId,
      fileSize: bytes.length,
      version: args.version,
      changelogEntry: args.changelogEntry,
      readme: args.readme,
    });
    return storageId;
  },
});

export const applyPluginUpdate = internalMutation({
  args: {
    slug: v.string(),
    storageId: v.id("_storage"),
    fileSize: v.number(),
    version: v.string(),
    changelogEntry: v.string(),
    readme: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const plugin = await ctx.db
      .query("customPlugins")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (!plugin) throw new Error(`Plugin not found: ${args.slug}`);
    await ctx.db.patch(plugin._id, {
      fileStorageId: args.storageId,
      fileSize: args.fileSize,
      version: args.version,
      changelog: `${args.changelogEntry}\n\n${plugin.changelog ?? ""}`.trim(),
      ...(args.readme ? { readme: args.readme } : {}),
      updatedAt: Date.now(),
    });
    return plugin._id;
  },
});
