import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

/** List all build requests */
export const list = query({
  args: {
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("review"),
      v.literal("completed"),
      v.literal("cancelled"),
    )),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    if (args.status) {
      return await ctx.db
        .query("buildRequests")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .collect();
    }

    const all = await ctx.db
      .query("buildRequests")
      .withIndex("by_created")
      .order("desc")
      .collect();
    return all;
  },
});

/** Get a single build request */
export const get = query({
  args: { id: v.id("buildRequests") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return await ctx.db.get(args.id);
  },
});

/** Create a new build request */
export const create = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    requirements: v.optional(v.string()),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    requestedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    return await ctx.db.insert("buildRequests", {
      title: args.title,
      description: args.description,
      requirements: args.requirements,
      status: "pending",
      priority: args.priority,
      requestedBy: args.requestedBy,
      messages: [{
        role: "user",
        content: `**${args.title}**\n\n${args.description}${args.requirements ? `\n\n**Requirements:**\n${args.requirements}` : ""}`,
        timestamp: Date.now(),
      }],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

/** Add a message to a build request */
export const addMessage = mutation({
  args: {
    id: v.id("buildRequests"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const request = await ctx.db.get(args.id);
    if (!request) throw new Error("Request not found");

    const messages = [...request.messages, {
      role: args.role,
      content: args.content,
      timestamp: Date.now(),
    }];

    await ctx.db.patch(args.id, {
      messages,
      updatedAt: Date.now(),
    });
  },
});

/** Update build request status */
export const updateStatus = mutation({
  args: {
    id: v.id("buildRequests"),
    status: v.union(
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("review"),
      v.literal("completed"),
      v.literal("cancelled"),
    ),
    resultPluginId: v.optional(v.id("customPlugins")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const patch: Record<string, unknown> = {
      status: args.status,
      updatedAt: Date.now(),
    };
    if (args.resultPluginId) {
      patch.resultPluginId = args.resultPluginId;
    }

    await ctx.db.patch(args.id, patch);
  },
});

/** Send a message to Viktor AI and get a response */
export const sendToViktor = action({
  args: {
    id: v.id("buildRequests"),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    // Add user message
    await ctx.runMutation(api.buildRequests.addMessage, {
      id: args.id,
      role: "user",
      content: args.message,
    });

    // Update status to in_progress if pending
    const request = await ctx.runQuery(api.buildRequests.get, { id: args.id });
    if (request && request.status === "pending") {
      await ctx.runMutation(api.buildRequests.updateStatus, {
        id: args.id,
        status: "in_progress",
      });
    }

    // Add acknowledgment — real plugin builds happen via Slack / Viktor AI
    await ctx.runMutation(api.buildRequests.addMessage, {
      id: args.id,
      role: "assistant",
      content: "I've noted your request! The build request has been queued. Viktor will review the requirements and start building the plugin. You can add more details to this conversation at any time.",
    });

    return { success: true };
  },
});

/** Stats for build requests */
export const stats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const all = await ctx.db.query("buildRequests").collect();
    return {
      total: all.length,
      pending: all.filter((r) => r.status === "pending").length,
      inProgress: all.filter((r) => r.status === "in_progress").length,
      review: all.filter((r) => r.status === "review").length,
      completed: all.filter((r) => r.status === "completed").length,
    };
  },
});
