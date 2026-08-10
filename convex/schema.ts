import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const schema = defineSchema({
  ...authTables,

  // Build requests (chat with Viktor to build plugins)
  buildRequests: defineTable({
    title: v.string(),
    description: v.string(),
    requirements: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("review"),
      v.literal("completed"),
      v.literal("cancelled"),
    ),
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
    ),
    requestedBy: v.string(),
    messages: v.array(v.object({
      role: v.union(v.literal("user"), v.literal("assistant")),
      content: v.string(),
      timestamp: v.number(),
    })),
    resultPluginId: v.optional(v.id("customPlugins")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_created", ["createdAt"]),

  // Custom plugins repository
  customPlugins: defineTable({
    slug: v.string(),
    name: v.string(),
    description: v.string(),
    version: v.string(),
    author: v.string(),
    category: v.union(
      v.literal("starter"),
      v.literal("utility"),
      v.literal("integration"),
      v.literal("custom"),
    ),
    readme: v.optional(v.string()),
    changelog: v.optional(v.string()),
    fileStorageId: v.optional(v.id("_storage")),
    fileSize: v.optional(v.number()),
    downloadCount: v.number(),
    isStarter: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
    createdBy: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    gitRepo: v.optional(v.string()),
    installedOnSites: v.optional(v.array(v.string())),
  })
    .index("by_slug", ["slug"])
    .index("by_category", ["category"])
    .index("by_is_starter", ["isStarter"]),

  // App settings
  settings: defineTable({
    key: v.string(),
    value: v.string(),
  }).index("by_key", ["key"]),
});

export default schema;
