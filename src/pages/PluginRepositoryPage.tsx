import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Package,
  Search,
  Download,
  Star,
  Tag,
  Sparkles,
  Loader2,
  FileText,
  Calendar,
} from "lucide-react";
import type { Id } from "../../convex/_generated/dataModel";

const categoryConfig = {
  starter: { label: "Starter", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  utility: { label: "Utility", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  integration: { label: "Integration", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  custom: { label: "Custom", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function DownloadButton({
  storageId,
  pluginId,
  slug,
  size,
}: {
  storageId: Id<"_storage"> | undefined;
  pluginId: Id<"customPlugins">;
  slug: string;
  size?: number;
}) {
  const [downloading, setDownloading] = useState(false);
  const downloadUrl = useQuery(
    api.customPlugins.getDownloadUrl,
    storageId ? { storageId } : "skip",
  );
  const incrementDownloads = useMutation(api.customPlugins.incrementDownloads);

  const handleDownload = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!downloadUrl) return;
      setDownloading(true);
      try {
        const res = await fetch(downloadUrl);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${slug}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        await incrementDownloads({ id: pluginId });
      } catch (err) {
        console.error("Download failed:", err);
      } finally {
        setDownloading(false);
      }
    },
    [downloadUrl, slug, pluginId, incrementDownloads],
  );

  if (!storageId) {
    return (
      <Button variant="outline" size="sm" disabled className="shrink-0">
        <Package className="size-3.5 mr-1.5" />
        No file
      </Button>
    );
  }

  return (
    <Button
      variant="default"
      size="sm"
      onClick={handleDownload}
      disabled={!downloadUrl || downloading}
      className="shrink-0"
    >
      {downloading ? (
        <Loader2 className="size-3.5 mr-1.5 animate-spin" />
      ) : (
        <Download className="size-3.5 mr-1.5" />
      )}
      Download{size ? ` (${formatBytes(size)})` : ""}
    </Button>
  );
}

export function PluginRepositoryPage() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [expandedPlugin, setExpandedPlugin] = useState<string | null>(null);

  const plugins = useQuery(api.customPlugins.list, {});

  const filteredPlugins = (plugins ?? []).filter((p) => {
    if (search) {
      const term = search.toLowerCase();
      if (
        !p.name.toLowerCase().includes(term) &&
        !p.slug.toLowerCase().includes(term) &&
        !p.description.toLowerCase().includes(term) &&
        !(p.tags || []).some((t: string) => t.toLowerCase().includes(term))
      )
        return false;
    }
    if (categoryFilter && p.category !== categoryFilter) return false;
    return true;
  });

  // Separate starter from rest
  const starterPlugin = filteredPlugins.find((p) => p.isStarter);
  const otherPlugins = filteredPlugins.filter((p) => !p.isStarter);

  return (
    <div className="max-w-[1000px] mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Plugin Repository</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Browse and download custom-built WordPress plugins
        </p>
      </div>

      {/* Search + Category Filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search plugins..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <button
            onClick={() => setCategoryFilter(null)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              categoryFilter === null
                ? "bg-background shadow text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All
          </button>
          {Object.entries(categoryConfig).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setCategoryFilter(categoryFilter === key ? null : key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                categoryFilter === key
                  ? "bg-background shadow text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {cfg.label}
            </button>
          ))}
        </div>
      </div>

      {/* Starter Plugin Featured Card */}
      {starterPlugin && (
        <div
          className="rounded-xl border-2 border-emerald-200 dark:border-emerald-800 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 p-6 cursor-pointer hover:shadow-lg transition-all group"
          onClick={() =>
            setExpandedPlugin(
              expandedPlugin === starterPlugin._id ? null : starterPlugin._id,
            )
          }
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-emerald-600 shrink-0">
                <Sparkles className="size-6 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h2 className="text-lg font-bold">{starterPlugin.name}</h2>
                  <Badge className="bg-emerald-600 text-white text-xs">
                    <Star className="size-3 mr-1" /> Starter Template
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    v{starterPlugin.version}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                  {starterPlugin.description}
                </p>
                <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Download className="size-3" /> {starterPlugin.downloadCount} downloads
                  </span>
                  <span>by {starterPlugin.author}</span>
                  {starterPlugin.tags && starterPlugin.tags.length > 0 && (
                    <span className="flex items-center gap-1">
                      <Tag className="size-3" />
                      {starterPlugin.tags.join(", ")}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="size-3" />
                    {formatDate(starterPlugin.createdAt)}
                  </span>
                </div>
              </div>
            </div>
            <DownloadButton
              storageId={starterPlugin.fileStorageId}
              pluginId={starterPlugin._id}
              slug={starterPlugin.slug}
              size={starterPlugin.fileSize}
            />
          </div>

          {/* Expanded readme */}
          {expandedPlugin === starterPlugin._id && starterPlugin.readme && (
            <div className="mt-5 pt-5 border-t border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="size-4 text-emerald-600" />
                <h3 className="text-sm font-semibold">README</h3>
              </div>
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono bg-background/60 rounded-lg p-4 max-h-96 overflow-y-auto">
                {starterPlugin.readme}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Other Plugins */}
      <div className="space-y-2">
        {plugins === undefined ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-lg border p-4 animate-pulse">
              <div className="h-5 bg-muted rounded w-48 mb-2" />
              <div className="h-3 bg-muted rounded w-96" />
            </div>
          ))
        ) : otherPlugins.length === 0 && !starterPlugin ? (
          <div className="rounded-xl border-2 border-dashed p-16 text-center">
            <Package className="size-12 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="font-semibold text-lg mb-1">No custom plugins yet</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Custom plugins will appear here as they're built. Use the Plugin
              Builder to request new plugins from Viktor.
            </p>
          </div>
        ) : (
          otherPlugins.map((plugin) => {
            const catConfig = categoryConfig[plugin.category];
            const isExpanded = expandedPlugin === plugin._id;

            return (
              <div
                key={plugin._id}
                className="rounded-lg border p-4 cursor-pointer hover:bg-muted/30 transition-colors group"
                onClick={() =>
                  setExpandedPlugin(isExpanded ? null : plugin._id)
                }
              >
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 shrink-0">
                    <Package className="size-5 text-indigo-600 dark:text-indigo-400" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{plugin.name}</h3>
                      <Badge variant="outline" className="text-xs">
                        v{plugin.version}
                      </Badge>
                      <Badge className={`text-xs ${catConfig.color}`}>
                        {catConfig.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5 truncate">
                      {plugin.description}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Download className="size-3" /> {plugin.downloadCount}
                      </span>
                      <span>by {plugin.author}</span>
                      {plugin.tags && plugin.tags.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Tag className="size-3" />
                          {plugin.tags.slice(0, 3).join(", ")}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3" />
                        {formatDate(plugin.createdAt)}
                      </span>
                    </div>
                  </div>

                  <DownloadButton
                    storageId={plugin.fileStorageId}
                    pluginId={plugin._id}
                    slug={plugin.slug}
                    size={plugin.fileSize}
                  />
                </div>

                {/* Expanded readme */}
                {isExpanded && plugin.readme && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="size-4 text-muted-foreground" />
                      <h3 className="text-sm font-semibold">README</h3>
                    </div>
                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono bg-muted/50 rounded-lg p-4 max-h-96 overflow-y-auto">
                      {plugin.readme}
                    </pre>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
