import { useMutation, useQuery } from "convex/react";
import { Check, Copy, Download, Loader2, Trash2, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";

type Props = {
  plugin: Doc<"customPlugins">;
  onUpload: () => void;
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

function messageOf(err: unknown, fallback: string): string {
  return err instanceof Error
    ? err.message.replace(/^.*Uncaught Error:\s*/s, "").split("\n")[0]
    : fallback;
}

function VersionDownload({ storageId }: { storageId: Doc<"pluginVersions">["fileStorageId"] }) {
  const url = useQuery(api.customPlugins.getDownloadUrl, { storageId });
  return (
    <Button variant="outline" size="sm" disabled={!url} asChild={!!url}>
      {url ? (
        <a href={url} download onClick={e => e.stopPropagation()}>
          <Download className="size-3.5" />
          <span className="sr-only sm:not-sr-only">Download</span>
        </a>
      ) : (
        <span>
          <Download className="size-3.5" />
        </span>
      )}
    </Button>
  );
}

export function VersionsPanel({ plugin, onUpload }: Props) {
  const versions = useQuery(api.pluginVersions.listByPlugin, {
    pluginId: plugin._id,
  });
  const setCurrent = useMutation(api.pluginVersions.setCurrent);
  const removeVersion = useMutation(api.pluginVersions.removeVersion);

  const [pendingCurrent, setPendingCurrent] =
    useState<Doc<"pluginVersions"> | null>(null);
  const [pendingDelete, setPendingDelete] =
    useState<Doc<"pluginVersions"> | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const updateUrl = `${window.location.origin}/wp-updates/${plugin.slug}.json`;

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(updateUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy the URL");
    }
  };

  const confirmCurrent = async () => {
    if (!pendingCurrent) return;
    setBusyId(pendingCurrent._id);
    try {
      await setCurrent({ versionId: pendingCurrent._id });
      toast.success(`${plugin.name} ${pendingCurrent.version} is now the current version`);
    } catch (err) {
      toast.error(messageOf(err, "Could not change the current version"));
    } finally {
      setBusyId(null);
      setPendingCurrent(null);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setBusyId(pendingDelete._id);
    try {
      await removeVersion({ versionId: pendingDelete._id });
      toast.success(`Version ${pendingDelete.version} deleted`);
    } catch (err) {
      toast.error(messageOf(err, "Could not delete the version"));
    } finally {
      setBusyId(null);
      setPendingDelete(null);
    }
  };

  return (
    <div className="mt-4 space-y-4 border-t pt-4" onClick={e => e.stopPropagation()}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">Versions</h3>
          <button
            onClick={copyUrl}
            className="mt-1 flex max-w-full items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            title="Copy the update URL"
          >
            {copied ? (
              <Check className="size-3 shrink-0" />
            ) : (
              <Copy className="size-3 shrink-0" />
            )}
            <span className="truncate font-mono">{updateUrl}</span>
          </button>
        </div>
        <Button size="sm" onClick={onUpload}>
          <Upload className="size-3.5" />
          Upload new version
        </Button>
      </div>

      {versions === undefined ? (
        <div className="h-16 animate-pulse rounded-lg bg-muted" />
      ) : versions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No versions yet.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {versions.map(version => {
            const isCurrent = plugin.activeVersionId === version._id;
            return (
              <li key={version._id} className="flex flex-wrap items-start gap-3 p-3">
                <div className="min-w-0 flex-1 basis-56">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-semibold">
                      v{version.version}
                    </span>
                    {isCurrent && (
                      <Badge className="bg-emerald-600 text-xs text-white">
                        Current
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatDate(version.createdAt)} · {formatBytes(version.fileSize)}
                    {version.uploadedBy ? ` · ${version.uploadedBy}` : ""}
                  </p>
                  {version.changelog && (
                    <pre className="mt-2 max-h-32 overflow-y-auto whitespace-pre-wrap font-sans text-xs text-muted-foreground">
                      {version.changelog}
                    </pre>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {!isCurrent && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busyId === version._id}
                      onClick={() => setPendingCurrent(version)}
                    >
                      {busyId === version._id && (
                        <Loader2 className="size-3.5 animate-spin" />
                      )}
                      Set as current
                    </Button>
                  )}
                  <VersionDownload storageId={version.fileStorageId} />
                  {!isCurrent && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive"
                      aria-label={`Delete version ${version.version}`}
                      onClick={() => setPendingDelete(version)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <AlertDialog
        open={!!pendingCurrent}
        onOpenChange={open => !open && setPendingCurrent(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Set {pendingCurrent?.version} as the current version?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Every site running {plugin.name} on an older version will be
              offered this one and can update to it. Sites already on a newer
              version stay where they are.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmCurrent()}>
              Set as current
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={open => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete version {pendingDelete?.version}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              The zip file is removed permanently. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDelete()}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
