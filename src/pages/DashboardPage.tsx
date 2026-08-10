import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useNavigate } from "react-router-dom";
import {
  Hammer,
  Package,
  ArrowRight,
  Plus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function QuickActionCard({
  title,
  description,
  icon: Icon,
  iconColor,
  href,
  badge,
}: {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  href: string;
  badge?: { label: string; variant: "default" | "secondary" | "destructive" | "outline" };
}) {
  const navigate = useNavigate();

  return (
    <div
      className="group rounded-xl border p-6 cursor-pointer hover:shadow-md hover:border-primary/30 transition-all"
      onClick={() => navigate(href)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`p-3 rounded-xl ${iconColor}`}>
          <Icon className="size-6 text-white" />
        </div>
        {badge && (
          <Badge variant={badge.variant} className="text-xs">
            {badge.label}
          </Badge>
        )}
      </div>
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      <div className="flex items-center gap-1 mt-4 text-sm text-primary font-medium group-hover:gap-2 transition-all">
        Open <ArrowRight className="size-3.5" />
      </div>
    </div>
  );
}

export function DashboardPage() {
  const buildStats = useQuery(api.buildRequests.stats);
  const navigate = useNavigate();

  return (
    <div className="max-w-[1000px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Plugin Builder</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Build custom WordPress plugins and manage your repository
          </p>
        </div>
        <Button
          className="bg-orange-600 hover:bg-orange-700"
          onClick={() => navigate("/builder")}
        >
          <Plus className="size-4 mr-2" /> New Plugin Request
        </Button>
      </div>

      {/* Stats */}
      {buildStats && buildStats.total > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="rounded-lg border p-3 text-center">
            <p className="text-xl font-bold">{buildStats.total}</p>
            <p className="text-xs text-muted-foreground">Total Requests</p>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <p className="text-xl font-bold text-amber-600">{buildStats.pending}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <p className="text-xl font-bold text-blue-600">{buildStats.inProgress}</p>
            <p className="text-xs text-muted-foreground">Building</p>
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

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <QuickActionCard
          title="Plugin Builder"
          description="Request custom WordPress plugins from Viktor. Describe what you need and Viktor will build it — from utility plugins to full integrations."
          icon={Hammer}
          iconColor="bg-orange-600"
          href="/builder"
          badge={
            buildStats && buildStats.pending > 0
              ? { label: `${buildStats.pending} pending`, variant: "secondary" }
              : undefined
          }
        />
        <QuickActionCard
          title="Plugin Repository"
          description="Browse and download custom-built WordPress plugins. Includes the YST Starter Plugin template and all completed builds."
          icon={Package}
          iconColor="bg-indigo-600"
          href="/repository"
        />
      </div>
    </div>
  );
}
