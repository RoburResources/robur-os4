import GlassCard from "@/components/ui/GlassCard";
import AlertCard from "@/components/ui/AlertCard";

const alerts = [
  { severity: "warning", message: "ROB-142 Overdue Service", detail: "Service due 3 days ago · 12 min ago", remediation: { type: "maintenance", text: "Maintenance job auto-created", link: "/jobs" } },
  { severity: "critical", message: "Geelong Rd Closure", detail: "Road closed 6:00–18:00 · 45 min ago", remediation: { type: "dispatched", text: "3 affected jobs flagged for rerouting" } },
  { severity: "info", message: "New Job Assigned", detail: "JOB-2845 for Hansen Yuncken CBD · 1h ago" },
  { severity: "success", message: "JOB-2839 Completed", detail: "Bin exchange at Visy Recycling · 2h ago" },
];

export default function AlertsPanel() {
  return (
    <GlassCard level={2} className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-robur-steel">Alerts</h3>
        <span className="text-xs font-medium text-red-400">2 critical</span>
      </div>

      <div className="space-y-2">
        {alerts.map((alert, i) => (
          <AlertCard key={i} alert={alert} onAction={(link) => window.location.href = link} />
        ))}
      </div>
    </GlassCard>
  );
}