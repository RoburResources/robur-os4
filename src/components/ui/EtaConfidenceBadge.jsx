import { cn } from "@/lib/utils";
import { CheckCircle2, Clock, AlertTriangle } from "lucide-react";

/**
 * EtaConfidenceBadge — shows real-time ETA confidence based on
 * job status, time until scheduled, and dispatch state.
 * Replaces static scheduled times with a confidence indicator.
 *
 * Levels: "high" (on track), "medium" (at risk), "delayed" (behind)
 */

function getConfidence(job) {
  if (!job?.scheduled_time) return { level: "unknown", label: "—", icon: Clock, color: "text-robur-steel", bg: "bg-robur-steel/10" };

  const now = new Date();
  const scheduled = new Date(job.scheduled_time);
  const minutesUntil = Math.round((scheduled - now) / 60000);

  // Completed jobs are always "on time"
  if (job.status === "completed") return { level: "high", label: "Done", icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" };

  // En route and on schedule
  if (job.status === "en_route" || job.status === "dispatched") {
    if (minutesUntil >= -15) return { level: "high", label: "On track", icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" };
    return { level: "delayed", label: "Delayed", icon: AlertTriangle, color: "text-red-500", bg: "bg-red-50" };
  }

  // Assigned but not yet dispatched
  if (job.status === "assigned") {
    if (minutesUntil > 60) return { level: "high", label: "Scheduled", icon: Clock, color: "text-sky-500", bg: "bg-sky-50" };
    if (minutesUntil > 15) return { level: "medium", label: "At risk", icon: Clock, color: "text-amber-600", bg: "bg-amber-50" };
    return { level: "delayed", label: "Behind", icon: AlertTriangle, color: "text-red-500", bg: "bg-red-50" };
  }

  // Created/scheduled — far out
  if (minutesUntil > 120) return { level: "high", label: "Scheduled", icon: Clock, color: "text-sky-500", bg: "bg-sky-50" };
  if (minutesUntil > 30) return { level: "medium", label: "Upcoming", icon: Clock, color: "text-amber-600", bg: "bg-amber-50" };
  return { level: "delayed", label: "Urgent", icon: AlertTriangle, color: "text-red-500", bg: "bg-red-50" };
}

export default function EtaConfidenceBadge({ job, size = "sm" }) {
  const conf = getConfidence(job);
  const Icon = conf.icon;

  const sizes = {
    sm: "px-1.5 py-0.5 text-[8px] gap-0.5",
    md: "px-2 py-1 text-[10px] gap-1",
  };

  return (
    <span className={cn("inline-flex items-center rounded-md font-bold", conf.bg, conf.color, sizes[size])}>
      <Icon className={size === "sm" ? "h-2 w-2" : "h-3 w-3"} strokeWidth={2.5} />
      {conf.label}
    </span>
  );
}