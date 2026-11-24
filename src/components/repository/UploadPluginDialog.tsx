import { useAction, useMutation, useQuery } from "convex/react";
import { FileArchive, Loader2, Upload } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";

type Category = "starter" | "utility" | "integration" | "custom";

type Inspected = {
  folder: string;
  name: string;
  version?: string;
  description?: string;
  author?: string;
  requires?: string;
  requiresPhp?: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plugins: Doc<"customPlugins">[];
  targetPlugin?: Doc<"customPlugins">;
};

const MAX_BYTES = 100 * 1024 * 1024;

function compareVersions(a: string, b: string): number {
  const pa = a.split(/[.+-]/).map(part => Number.parseInt(part, 10) || 0);
  const pb = b.split(/[.+-]/).map(part => Number.parseInt(part, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export function UploadPluginDialog({
  open,
  onOpenChange,
  plugins,
  targetPlugin,
}: Props) {
  const generateUploadUrl = useMutation(api.customPlugins.generateUploadUrl);
  const inspectZip = useAction(api.pluginUpload.inspectZip);
  const register = useMutation(api.pluginVersions.register);
  const discardUpload = useMutation(api.pluginVersions.discardUpload);

  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState<"upload" | "save" | null>(null);
  const [error, setError] = useState("");
  const [storageId, setStorageId] = useState<Id<"_storage"> | null>(null);
  const [fileName, setFileName] = useState("");
  const [meta, setMeta] = useState<Inspected | null>(null);

  const [version, setVersion] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [author, setAuthor] = useState("");
  const [category, setCategory] = useState<Category>("custom");
  const [tags, setTags] = useState("");
  const [changelog, setChangelog] = useState("");
  const [makeCurrent, setMakeCurrent] = useState(true);

  const existing =
    targetPlugin ?? plugins.find(plugin => plugin.slug === meta?.folder);
  const versions = useQuery(
    api.pluginVersions.listByPlugin,
    existing ? { pluginId: existing._id } : "skip",
  );
  const duplicate = versions?.some(entry => entry.version === version.trim());
  const olderThanCurrent =
    existing && version.trim() && compareVersions(version.trim(), existing.version) < 0;
  const slugMismatch = !!targetPlugin && !!meta && meta.folder !== targetPlugin.slug;

  const reset = useCallback(() => {
    setDragging(false);
    setBusy(null);
    setError("");
    setStorageId(null);
    setFileName("");
    setMeta(null);
    setVersion("");
    setName("");
    setDescription("");
    setAuthor("");
    setCategory("custom");
    setTags("");
    setChangelog("");
    setMakeCurrent(true);
  }, []);

  const close = useCallback(async () => {
    if (storageId) {
      try {
        await discardUpload({ storageId });
      } catch {
        
      }
    }
    reset();
    onOpenChange(false);
  }, [storageId, discardUpload, reset, onOpenChange]);

  const handleFile = useCallback(
    async (file: File) => {
      setError("");
      if (!file.name.toLowerCase().endsWith(".zip")) {
        setError("Choose a .zip file.");
        return;
      }
      if (file.size > MAX_BYTES) {
        setError("The zip is larger than 100 MB.");
        return;
      }
      setBusy("upload");
      let uploaded: Id<"_storage"> | null = null;
      try {
        const url = await generateUploadUrl();
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/zip" },
          body: file,
        });
        if (!res.ok) throw new Error(`Upload failed (${res.status})`);
        const json = (await res.json()) as { storageId: Id<"_storage"> };
        uploaded = json.storageId;

        const info = await inspectZip({ storageId: uploaded });
        const match = plugins.find(plugin => plugin.slug === info.folder);
        setStorageId(uploaded);
        setFileName(file.name);
        setMeta(info);
        setVersion(info.version ?? "");
        setName(match?.name ?? info.name);
        setDescription(match?.description ?? info.description ?? "");
        setAuthor(match?.author ?? info.author ?? "");
        setCategory(match?.category ?? "custom");
        setTags((match?.tags ?? []).join(", "));
      } catch (err) {
        if (uploaded) {
          try {
            await discardUpload({ storageId: uploaded });
          } catch {
            
          }
        }
        setError(
          err instanceof Error
            ? err.message.replace(/^.*Uncaught Error:\s*/s, "").split("\n")[0]
            : "Upload failed.",
        );
      } finally {
        setBusy(null);
      }
    },
    [generateUploadUrl, inspectZip, discardUpload, plugins],
  );

  const handleSave = useCallback(async () => {
    if (!storageId || !meta) return;
    setError("");
    setBusy("save");
    try {
      await register({
        storageId,
        slug: meta.folder,
        version: version.trim(),
        changelog: changelog.trim() || undefined,
        makeCurrent: existing ? makeCurrent : true,
        name: name.trim() || undefined,
        description: description.trim() || undefined,
        author: author.trim() || undefined,
        category: existing ? undefined : category,
        tags: existing
          ? undefined
          : tags
              .split(",")
              .map(tag => tag.trim())
              .filter(Boolean),
        requires: meta.requires,
        requiresPhp: meta.requiresPhp,
      });
      toast.success(`${name.trim() || meta.folder} ${version.trim()} uploaded`);
      reset();
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message.replace(/^.*Uncaught Error:\s*/s, "").split("\n")[0]
          : "Could not save the version.",
      );
    } finally {
      setBusy(null);
    }
  }, [
    storageId,
    meta,
    version,
    changelog,
    existing,
    makeCurrent,
    name,
    description,
    author,
    category,
    tags,
    register,
    reset,
    onOpenChange,
  ]);

  const canSave =
    !!storageId &&
    !!meta &&
    !!version.trim() &&
    !duplicate &&
    !slugMismatch &&
    busy === null &&
    (!!existing || (!!name.trim() && !!description.trim() && !!author.trim()));

  return (
    <Dialog open={open} onOpenChange={next => (next ? onOpenChange(true) : close())}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {targetPlugin
              ? `Upload a new version of ${targetPlugin.name}`
              : "Upload plugin"}
          </DialogTitle>
          <DialogDescription>
            The zip must contain one folder named after the plugin with the main
            PHP file inside it. Name and version are read from its header.
          </DialogDescription>
        </DialogHeader>

        {!meta ? (
          <div
            onDragOver={e => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => {
              e.preventDefault();
              setDragging(false);
              const file = e.dataTransfer.files?.[0];
              if (file) void handleFile(file);
            }}
            onClick={() => inputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
              dragging ? "border-primary bg-primary/5" : "hover:bg-muted/40"
            }`}
          >
            {busy === "upload" ? (
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            ) : (
              <Upload className="size-8 text-muted-foreground" />
            )}
            <p className="text-sm font-medium">
              {busy === "upload"
                ? "Uploading and reading the zip..."
                : "Drop the plugin zip here or click to choose"}
            </p>
            <p className="text-xs text-muted-foreground">.zip, up to 100 MB</p>
            <input
              ref={inputRef}
              type="file"
              accept=".zip,application/zip"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void handleFile(file);
              }}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm">
              <FileArchive className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{fileName}</span>
              <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                {meta.folder}
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="up-version">Version</Label>
                <Input
                  id="up-version"
                  value={version}
                  onChange={e => setVersion(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="up-name">Name</Label>
                <Input
                  id="up-name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>
            </div>

            {duplicate && (
              <p className="text-sm text-destructive">
                Version {version.trim()} already exists. Change the version
                number in the plugin header and zip it again.
              </p>
            )}
            {slugMismatch && (
              <p className="text-sm text-destructive">
                This zip contains "{meta.folder}", not "{targetPlugin?.slug}".
              </p>
            )}
            {!duplicate && olderThanCurrent && (
              <p className="text-sm text-amber-600 dark:text-amber-400">
                This is older than the current version ({existing?.version}).
                Sites already on a newer version will not downgrade.
              </p>
            )}

            {!existing && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="up-description">Description</Label>
                  <Textarea
                    id="up-description"
                    rows={2}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="up-author">Author</Label>
                    <Input
                      id="up-author"
                      value={author}
                      onChange={e => setAuthor(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Category</Label>
                    <Select
                      value={category}
                      onValueChange={value => setCategory(value as Category)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="starter">Starter</SelectItem>
                        <SelectItem value="utility">Utility</SelectItem>
                        <SelectItem value="integration">Integration</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="up-tags">Tags (comma separated)</Label>
                  <Input
                    id="up-tags"
                    value={tags}
                    onChange={e => setTags(e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="up-changelog">What changed in this version</Label>
              <Textarea
                id="up-changelog"
                rows={4}
                placeholder="- Added ..."
                value={changelog}
                onChange={e => setChangelog(e.target.value)}
              />
            </div>

            {existing && (
              <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
                <div>
                  <Label htmlFor="up-current">Set as the current version</Label>
                  <p className="text-xs text-muted-foreground">
                    Sites download the current version automatically. Turn this
                    off to upload it without releasing it yet.
                  </p>
                </div>
                <Switch
                  id="up-current"
                  checked={makeCurrent}
                  onCheckedChange={setMakeCurrent}
                />
              </div>
            )}
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => void close()}>
            Cancel
          </Button>
          {meta && (
            <Button onClick={() => void handleSave()} disabled={!canSave}>
              {busy === "save" && <Loader2 className="size-4 animate-spin" />}
              Upload version
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
