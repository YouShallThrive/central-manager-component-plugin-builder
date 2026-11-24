import { getAuthUserId } from "@convex-dev/auth/server";
import { type ObjectType, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
  mutation,
  query,
} from "./_generated/server";

/*validation*/

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const VERSION_RE = /^\d+(\.\d+){1,3}([-+][0-9A-Za-z.-]+)?$/;

const categoryValidator = v.union(
  v.literal("starter"),
  v.literal("utility"),
  v.literal("integration"),
  v.literal("custom"),
);

/*helpers*/

async function requireUserEmail(ctx: MutationCtx): Promise<string> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  const user = await ctx.db.get(userId);
  return user?.email ?? String(userId);
}

export async function activateVersion(
  ctx: MutationCtx,
  plugin: Doc<"customPlugins">,
  version: Doc<"pluginVersions">,
) {
  await ctx.db.patch(plugin._id, {
    activeVersionId: version._id,
    version: version.version,
    fileStorageId: version.fileStorageId,
    fileSize: version.fileSize,
    updatedAt: Date.now(),
  });
}

async function storageMeta(ctx: MutationCtx, storageId: Id<"_storage">) {
  const meta = await ctx.db.system.get(storageId);
  if (!meta) throw new Error("Uploaded file not found");
  return { size: meta.size, sha256: meta.sha256 };
}

/*queries*/

export const listByPlugin = query({
  args: { pluginId: v.id("customPlugins") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    return await ctx.db
      .query("pluginVersions")
      .withIndex("by_plugin", (q) => q.eq("pluginId", args.pluginId))
      .order("desc")
      .collect();
  },
});

/*mutations*/

const registerArgs = {
  storageId: v.id("_storage"),
  slug: v.string(),
  version: v.string(),
  changelog: v.optional(v.string()),
  makeCurrent: v.boolean(),
  name: v.optional(v.string()),
  description: v.optional(v.string()),
  author: v.optional(v.string()),
  category: v.optional(categoryValidator),
  tags: v.optional(v.array(v.string())),
  readme: v.optional(v.string()),
  requires: v.optional(v.string()),
  tested: v.optional(v.string()),
  requiresPhp: v.optional(v.string()),
  };

export async function registerVersion(
  ctx: MutationCtx,
  args: ObjectType<typeof registerArgs>,
  uploadedBy: string,
) {
  if (!SLUG_RE.test(args.slug)) throw new Error("Invalid plugin slug");
  if (!VERSION_RE.test(args.version)) throw new Error("Invalid version");

  const { size, sha256 } = await storageMeta(ctx, args.storageId);
  const now = Date.now();

  let plugin = await ctx.db
    .query("customPlugins")
    .withIndex("by_slug", (q) => q.eq("slug", args.slug))
    .first();

  if (!plugin) {
    if (!args.name || !args.description || !args.author || !args.category) {
      throw new Error("Name, description, author and category are required for a new plugin");
    }
    const pluginId = await ctx.db.insert("customPlugins", {
      slug: args.slug,
      name: args.name,
      description: args.description,
      author: args.author,
      category: args.category,
      version: args.version,
      readme: args.readme,
      tags: args.tags,
      fileStorageId: args.storageId,
      fileSize: size,
      downloadCount: 0,
      isStarter: args.category === "starter",
      createdBy: uploadedBy,
      createdAt: now,
      updatedAt: now,
    });
    plugin = (await ctx.db.get(pluginId))!;
  }

  const existing = await ctx.db
    .query("pluginVersions")
    .withIndex("by_plugin_and_version", (q) =>
      q.eq("pluginId", plugin!._id).eq("version", args.version),
    )
    .first();
  if (existing) throw new Error(`Version ${args.version} already exists`);

  const versionId = await ctx.db.insert("pluginVersions", {
    pluginId: plugin._id,
    version: args.version,
    fileStorageId: args.storageId,
    fileSize: size,
    sha256,
    changelog: args.changelog?.trim() || undefined,
    requires: args.requires,
    tested: args.tested,
    requiresPhp: args.requiresPhp,
    uploadedBy,
    createdAt: now,
  });

  const isFirst = !plugin.activeVersionId;
  if (args.makeCurrent || isFirst) {
    const version = (await ctx.db.get(versionId))!;
    await activateVersion(ctx, plugin, version);
  }

  const metaPatch: Partial<Doc<"customPlugins">> = {};
  if (args.name && plugin.name !== args.name) metaPatch.name = args.name;
  if (args.description && plugin.description !== args.description) {
    metaPatch.description = args.description;
  }
  if (args.readme) metaPatch.readme = args.readme;
  if (Object.keys(metaPatch).length > 0 && (args.makeCurrent || isFirst)) {
    await ctx.db.patch(plugin._id, metaPatch);
  }

  return { pluginId: plugin._id, versionId };
}

export const register = mutation({
  args: registerArgs,
  handler: async (ctx, args) => {
    const uploadedBy = await requireUserEmail(ctx);
    return await registerVersion(ctx, args, uploadedBy);
  },
});

export const registerInternal = internalMutation({
  args: registerArgs,
  handler: async (ctx, args) => {
    return await registerVersion(ctx, args, "deploy");
  },
});

export const hasVersion = internalQuery({
  args: { slug: v.string(), version: v.string() },
  handler: async (ctx, args) => {
    const plugin = await ctx.db
      .query("customPlugins")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (!plugin) return false;
    const existing = await ctx.db
      .query("pluginVersions")
      .withIndex("by_plugin_and_version", (q) =>
        q.eq("pluginId", plugin._id).eq("version", args.version),
      )
      .first();
    return existing !== null;
  },
});

export const setCurrent = mutation({
  args: { versionId: v.id("pluginVersions") },
  handler: async (ctx, args) => {
    await requireUserEmail(ctx);
    const version = await ctx.db.get(args.versionId);
    if (!version) throw new Error("Version not found");
    const plugin = await ctx.db.get(version.pluginId);
    if (!plugin) throw new Error("Plugin not found");
    await activateVersion(ctx, plugin, version);
    return null;
  },
});

export const removeVersion = mutation({
  args: { versionId: v.id("pluginVersions") },
  handler: async (ctx, args) => {
    await requireUserEmail(ctx);
    const version = await ctx.db.get(args.versionId);
    if (!version) throw new Error("Version not found");
    const plugin = await ctx.db.get(version.pluginId);
    if (plugin?.activeVersionId === version._id) {
      throw new Error("The current version cannot be deleted. Set another version as current first.");
    }
    await ctx.storage.delete(version.fileStorageId);
    await ctx.db.delete(version._id);
    return null;
  },
});

export const discardUpload = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    await requireUserEmail(ctx);
    const versions = await ctx.db.query("pluginVersions").collect();
    const plugins = await ctx.db.query("customPlugins").collect();
    const inUse =
      versions.some((version) => version.fileStorageId === args.storageId) ||
      plugins.some((plugin) => plugin.fileStorageId === args.storageId);
    if (!inUse) await ctx.storage.delete(args.storageId);
    return null;
  },
});
