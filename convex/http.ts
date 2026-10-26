import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { auth } from "./auth";

const http = httpRouter();
auth.addHttpRoutes(http);

/**
 * WordPress plugin update API (public, like wordpress.org's update API).
 *
 * GET /wp-updates/{slug}.json  → update manifest for the plugin
 * GET /wp-updates/{slug}.zip   → the plugin package
 *
 * Sites reach these through the deployment origin (env-driven CONVEX_SITE_URL):
 *   {origin}/wp-updates/...           (production)
 *   {preview origin}/wp-updates-dev/... (preview → dev DB)
 */

const SLUG_RE = /^\/wp-updates\/([a-z0-9-]+)\.(json|zip)$/;

http.route({
  pathPrefix: "/wp-updates/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const match = url.pathname.match(SLUG_RE);
    if (!match) return new Response("Not found", { status: 404 });
    const [, slug, kind] = match;

    const plugin = await ctx.runQuery(internal.wpUpdates.getPluginForUpdate, { slug });
    if (!plugin) return new Response("Not found", { status: 404 });

    if (kind === "zip") {
      const blob = await ctx.storage.get(plugin.fileStorageId);
      if (!blob) return new Response("Package missing", { status: 404 });
      await ctx.runMutation(internal.wpUpdates.countDownload, { slug });
      return new Response(blob, {
        status: 200,
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="${slug}.zip"`,
          "Cache-Control": "no-cache",
        },
      });
    }

    // Manifest consumed by the plugin's Updater class.
    // ?v= busts the edge/CDN cache (Cloudflare caches zips ~4h and ignores no-cache)
    const packageUrl = `${url.origin}/wp-updates/${slug}.zip?v=${encodeURIComponent(plugin.version)}`;
    const manifest = {
      slug,
      name: plugin.name,
      version: plugin.version,
      author: plugin.author,
      requires: "6.4",
      tested: "6.8",
      requires_php: "8.1",
      last_updated: new Date(plugin.updatedAt).toISOString(),
      download_url: packageUrl,
      sections: {
        description: plugin.description,
        changelog: plugin.changelog,
      },
    };
    return new Response(JSON.stringify(manifest), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-cache" },
    });
  }),
});

export default http;
