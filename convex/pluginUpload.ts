import { v } from "convex/values";
import { action } from "./_generated/server";
import { listZipNames, MAX_ZIP_BYTES } from "./zipHeader";

/*actions*/

export const verifyUpload = action({
  args: { storageId: v.id("_storage"), slug: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const blob = await ctx.storage.get(args.storageId);
    if (!blob) throw new Error("Uploaded file not found");
    if (blob.size > MAX_ZIP_BYTES) throw new Error("The zip is larger than 100 MB");

    const names = await listZipNames(blob);
    const main = `${args.slug}/${args.slug}.php`;
    if (!names.includes(main)) {
      throw new Error(`The zip must contain ${main}`);
    }
    if (names.some((name) => !name.startsWith(`${args.slug}/`))) {
      throw new Error(`Every file in the zip must be inside the ${args.slug} folder`);
    }
    return { fileCount: names.length };
  },
});
