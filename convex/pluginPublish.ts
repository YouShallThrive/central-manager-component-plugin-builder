"use node";

import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { inflateRawSync } from "node:zlib";
import { inspectZipBuffer, MAX_ZIP_BYTES } from "./zipHeader";

const inflate = (data: Buffer, maxOutputLength: number) =>
  inflateRawSync(data, { maxOutputLength });

/*deploy publish*/

export const publishFromDeploy = internalAction({
  args: {
    base64: v.string(),
    changelog: v.optional(v.string()),
    category: v.union(
      v.literal("starter"),
      v.literal("utility"),
      v.literal("integration"),
      v.literal("custom"),
    ),
  },
  handler: async (ctx, args): Promise<string> => {
    const buf = Buffer.from(args.base64, "base64");
    if (buf.length > MAX_ZIP_BYTES) throw new Error("The zip is larger than 100 MB");
    const info = inspectZipBuffer(buf, inflate);
    if (!info.version) throw new Error("The plugin header has no Version");

    const exists = await ctx.runQuery(internal.pluginVersions.hasVersion, {
      slug: info.folder,
      version: info.version,
    });
    if (exists) return `${info.folder} ${info.version} already published`;

    const storageId = await ctx.storage.store(
      new Blob([buf], { type: "application/zip" }),
    );
    try {
      await ctx.runMutation(internal.pluginVersions.registerInternal, {
        storageId,
        slug: info.folder,
        version: info.version,
        changelog: args.changelog,
        makeCurrent: true,
        name: info.name,
        description: info.description,
        author: info.author,
        category: args.category,
        requires: info.requires,
        requiresPhp: info.requiresPhp,
      });
    } catch (err) {
      await ctx.storage.delete(storageId);
      throw err;
    }
    return `${info.folder} ${info.version} published as current`;
  },
});
