"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { inspectZipBuffer, MAX_ZIP_BYTES } from "./zipHeader";

/*actions*/

export const inspectZip = action({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const blob = await ctx.storage.get(args.storageId);
    if (!blob) throw new Error("Uploaded file not found");
    if (blob.size > MAX_ZIP_BYTES) throw new Error("The zip is larger than 100 MB");

    return inspectZipBuffer(Buffer.from(await blob.arrayBuffer()));
  },
});
