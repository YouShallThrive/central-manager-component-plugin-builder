import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { MAX_ZIP_BYTES } from "./zipHeader";

/*deploy publish*/

export const publishFromDeploy = internalAction({
  args: {
    base64: v.string(),
    slug: v.string(),
    version: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    author: v.optional(v.string()),
    requires: v.optional(v.string()),
    requiresPhp: v.optional(v.string()),
    changelog: v.optional(v.string()),
    category: v.union(
      v.literal("starter"),
      v.literal("utility"),
      v.literal("integration"),
      v.literal("custom"),
    ),
  },
  handler: async (ctx, args): Promise<string> => {
    const exists = await ctx.runQuery(internal.pluginVersions.hasVersion, {
      slug: args.slug,
      version: args.version,
    });
    if (exists) return `${args.slug} ${args.version} already published`;

    const bytes = Uint8Array.from(atob(args.base64), (c) => c.charCodeAt(0));
    if (bytes.length > MAX_ZIP_BYTES) throw new Error("The zip is larger than 100 MB");

    const storageId = await ctx.storage.store(
      new Blob([bytes], { type: "application/zip" }),
    );
    try {
      await ctx.runMutation(internal.pluginVersions.registerInternal, {
        storageId,
        slug: args.slug,
        version: args.version,
        changelog: args.changelog,
        makeCurrent: true,
        name: args.name,
        description: args.description,
        author: args.author,
        category: args.category,
        requires: args.requires,
        requiresPhp: args.requiresPhp,
      });
    } catch (err) {
      await ctx.storage.delete(storageId);
      throw err;
    }
    return `${args.slug} ${args.version} published as current`;
  },
});
