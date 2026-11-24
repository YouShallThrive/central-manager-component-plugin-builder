import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";

const http = httpRouter();
auth.addHttpRoutes(http);

/**
 * WordPress plugin update API (public, like wordpress.org's update API).
 *
 * GET /wp-updates/{slug}.json            → update manifest for the active version
 * GET /wp-updates/{slug}.zip             → package of the active version
 * GET /wp-updates/{slug}/{version}.zip   → package of one specific version
 *
 * Sites reach these through the public origin, which nginx proxies to the
 * Convex HTTP actions: {origin}/wp-updates/...
 */

/*routing*/

const CURRENT_RE = /^\/wp-updates\/([a-z0-9-]+)\.(json|zip)$/;
const PINNED_RE = /^\/wp-updates\/([a-z0-9-]+)\/(\d[0-9A-Za-z.+-]*)\.zip$/;

function parseRoute(pathname: string) {
  const current = pathname.match(CURRENT_RE);
  if (current) {
    return { slug: current[1], kind: current[2] as "json" | "zip", version: undefined };
  }
  const pinned = pathname.match(PINNED_RE);
  if (pinned) return { slug: pinned[1], kind: "zip" as const, version: pinned[2] };
  return null;
}

function publicOrigin(request: Request, url: URL): string {
  const host =
    request.headers.get("x-forwarded-host")?.split(",")[0].trim() ||
    request.headers.get("host") ||
    url.host;
  const local = /^(localhost|127\.|\[::1\])/.test(host);
  return `${local ? "http" : "https"}://${host}`;
}

/*handler*/

http.route({
  pathPrefix: "/wp-updates/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const route = parseRoute(url.pathname);
    if (!route) return new Response("Not found", { status: 404 });
    const { slug, kind, version } = route;

    const plugin = await ctx.runQuery(internal.wpUpdates.getPluginForUpdate, {
      slug,
      version,
    });
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

    // ?v= busts the edge/CDN cache (Cloudflare caches zips ~4h and ignores no-cache)
    const packageUrl = `${publicOrigin(request, url)}/wp-updates/${slug}.zip?v=${encodeURIComponent(plugin.version)}`;
    const manifest = {
      slug,
      name: plugin.name,
      version: plugin.version,
      author: plugin.author,
      requires: plugin.requires,
      tested: plugin.tested,
      requires_php: plugin.requiresPhp,
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
