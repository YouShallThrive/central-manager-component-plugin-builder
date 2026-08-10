import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Hammer,
  Plus,
  MessageSquare,
  Clock,
  CheckCircle2,
  XCircle,
  Play,
  Eye,
  ChevronRight,
} from "lucide-react";

const statusConfig = {
  pending: { label: "Pending", icon: Clock, color: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-900/30" },
  in_progress: { label: "In Progress", icon: Play, color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/30" },
  review: { label: "In Review", icon: Eye, color: "text-purple-600", bg: "bg-purple-100 dark:bg-purple-900/30" },
  completed: { label: "Completed", icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-900/30" },
  cancelled: { label: "Cancelled", icon: XCircle, color: "text-slate-500", bg: "bg-slate-100 dark:bg-slate-900/30" },
};

export function PluginBuilderPage() {
  const navigate = useNavigate();
  const buildRequests = useQuery(api.buildRequests.list, {});
  const buildStats = useQuery(api.buildRequests.stats);
  const createBuildRequest = useMutation(api.buildRequests.create);

  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!title.trim() || !description.trim()) return;
    setCreating(true);
    try {
      const id = await createBuildRequest({
        title: title.trim(),
        description: description.trim(),
        requirements: requirements.trim() || undefined,
        priority,
        requestedBy: "User",
      });
      setShowCreate(false);
      setTitle("");
      setDescription("");
      setRequirements("");
      setPriority("medium");
      navigate(`/plugin-builder/${id}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-[1000px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Plugin Builder</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Request custom WordPress plugins built by Viktor
          </p>
        </div>

        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button className="bg-orange-600 hover:bg-orange-700">
              <Plus className="size-4 mr-2" /> New Plugin Request
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>New Plugin Request</DialogTitle>
              <DialogDescription>
                Describe the WordPress plugin you need. Viktor will review and
                start building it.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Plugin Name</label>
                <Input
                  placeholder="e.g., YST Custom Login Redirect"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Description</label>
                <Textarea
                  placeholder="What should the plugin do? Be specific about functionality..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Detailed Requirements{" "}
                  <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <Textarea
                  placeholder="Technical details, edge cases, integrations needed..."
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  rows={3}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Priority</label>
                <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!title.trim() || !description.trim() || creating}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {creating ? "Creating..." : "Create Request"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      {buildStats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="rounded-lg border p-3 text-center">
            <p className="text-xl font-bold">{buildStats.total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <p className="text-xl font-bold text-amber-600">{buildStats.pending}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <p className="text-xl font-bold text-blue-600">{buildStats.inProgress}</p>
            <p className="text-xs text-muted-foreground">In Progress</p>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <p className="text-xl font-bold text-purple-600">{buildStats.review}</p>
            <p className="text-xs text-muted-foreground">In Review</p>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <p className="text-xl font-bold text-emerald-600">{buildStats.completed}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </div>
        </div>
      )}

      {/* Build Requests */}
      <div className="space-y-2">
        {buildRequests === undefined ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-lg border p-4 animate-pulse">
              <div className="h-5 bg-muted rounded w-64 mb-2" />
              <div className="h-3 bg-muted rounded w-96" />
            </div>
          ))
        ) : buildRequests.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed p-16 text-center">
            <Hammer className="size-12 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="font-semibold text-lg mb-1">No build requests yet</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
              Click "New Plugin Request" to describe a custom WordPress plugin
              and Viktor will build it for you.
            </p>
            <Button
              className="bg-orange-600 hover:bg-orange-700"
              onClick={() => setShowCreate(true)}
            >
              <Plus className="size-4 mr-2" /> Create Your First Request
            </Button>
          </div>
        ) : (
          buildRequests.map((request) => {
            const config = statusConfig[request.status];
            const StatusIcon = config.icon;

            return (
              <div
                key={request._id}
                className="rounded-lg border p-4 cursor-pointer hover:bg-muted/30 transition-colors group"
                onClick={() => navigate(`/plugin-builder/${request._id}`)}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2.5 rounded-lg ${config.bg}`}>
                    <StatusIcon className={`size-5 ${config.color}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate">{request.title}</h3>
                      <Badge variant="outline" className={`text-xs ${config.color}`}>
                        {config.label}
                      </Badge>
                      <Badge variant="secondary" className="text-xs capitalize">
                        {request.priority}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="truncate max-w-md">
                        {request.description.substring(0, 100)}
                        {request.description.length > 100 ? "..." : ""}
                      </span>
                      <span className="flex items-center gap-1 shrink-0">
                        <MessageSquare className="size-3" />
                        {request.messages.length} messages
                      </span>
                      <span className="shrink-0">
                        {new Date(request.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
