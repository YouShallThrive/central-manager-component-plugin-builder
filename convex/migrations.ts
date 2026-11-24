import { internalMutation } from "./_generated/server";

/*versions backfill*/

export const backfillVersions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const plugins = await ctx.db.query("customPlugins").collect();
    let created = 0;

    for (const plugin of plugins) {
      if (plugin.activeVersionId || !plugin.fileStorageId) continue;

      const existing = await ctx.db
        .query("pluginVersions")
        .withIndex("by_plugin_and_version", (q) =>
          q.eq("pluginId", plugin._id).eq("version", plugin.version),
        )
        .first();

      const versionId =
        existing?._id ??
        (await ctx.db.insert("pluginVersions", {
          pluginId: plugin._id,
          version: plugin.version,
          fileStorageId: plugin.fileStorageId,
          fileSize: plugin.fileSize ?? 0,
          uploadedBy: plugin.createdBy ?? "migration",
          createdAt: plugin.updatedAt,
        }));

      await ctx.db.patch(plugin._id, { activeVersionId: versionId });
      created++;
    }

    return { plugins: plugins.length, backfilled: created };
  },
});
