import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { internalMutation, internalQuery, type QueryCtx } from "./_generated/server";

/**
 * Internal helpers for the WordPress plugin-update endpoints in http.ts.
 * The HTTP routes are public (like wordpress.org's update API): sites poll
 * the manifest and download the package zip.
 */

/*changelog*/

function formatEntry(version: Doc<"pluginVersions">): string {
  const entry = (version.changelog ?? "").trim();
  const heading = version.version.toLowerCase();
  const first = entry.split("\n")[0].toLowerCase();
  if (first.includes(heading)) return entry;
  return `v${version.version}\n${entry}`;
}

async function buildChangelog(
  ctx: QueryCtx,
  plugin: Doc<"customPlugins">,
  target: Doc<"pluginVersions">,
): Promise<string> {
  const versions = await ctx.db
    .query("pluginVersions")
    .withIndex("by_plugin", (q) => q.eq("pluginId", plugin._id))
    .order("desc")
    .collect();
  const entries = versions
    .filter((entry) => entry.changelog && entry.createdAt <= target.createdAt)
    .map(formatEntry);
  return [...entries, (plugin.changelog ?? "").trim()].filter(Boolean).join("\n\n");
}

/*queries*/

export const getPluginForUpdate = internalQuery({
  args: { slug: v.string(), version: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const plugin = await ctx.db
      .query("customPlugins")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (!plugin) return null;

    let target: Doc<"pluginVersions"> | null = null;
    if (args.version) {
      target = await ctx.db
        .query("pluginVersions")
        .withIndex("by_plugin_and_version", (q) =>
          q.eq("pluginId", plugin._id).eq("version", args.version!),
        )
        .first();
    } else if (plugin.activeVersionId) {
      target = await ctx.db.get(plugin.activeVersionId);
    }
    if (!target) return null;

    return {
      slug: plugin.slug,
      name: plugin.name,
      version: target.version,
      author: plugin.author,
      description: plugin.description,
      changelog: await buildChangelog(ctx, plugin, target),
      fileStorageId: target.fileStorageId,
      fileSize: target.fileSize,
      requires: target.requires ?? "6.4",
      tested: target.tested ?? "6.8",
      requiresPhp: target.requiresPhp ?? "8.1",
      updatedAt: args.version ? target.createdAt : plugin.updatedAt,
    };
  },
});

/*mutations*/

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
