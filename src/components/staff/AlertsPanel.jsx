import { useState, useEffect } from "react";
import GlassCard from "@/components/ui/GlassCard";
import AlertCard from "@/components/ui/AlertCard";
import { base44 } from "@/api/base44Client";

export default function AlertsPanel() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAlerts() {
      try {
        const [vehicles, jobs] = await Promise.all([
          base44.entities.Vehicle.list(),
          base44.entities.Job.list(),
        ]);

        const generated = [];

        // Vehicle-based alerts
        vehicles.forEach((v) => {
          if (v.status === "maintenance") {
            generated.push({
              severity: "warning",
              message: `${v.vehicle_id} In Maintenance`,
              detail: v.next_service ? `Next service: ${v.next_service}` : "Undergoing repairs",
              remediation: { type: "maintenance", text: "View maintenance schedule", link: "/fleet" },
            });
          }
          if (v.fuel_pct != null && v.fuel_pct < 20) {
            generated.push({
              severity: "critical",
              message: `${v.vehicle_id} Low Fuel`,
              detail: `Fuel at ${v.fuel_pct}% — refuel required`,
              remediation: { type: "fuel", text: "Alert sent to operations" },
            });
          }
          if (v.health_pct != null && v.health_pct < 50) {
            generated.push({
              severity: "warning",
              message: `${v.vehicle_id} Health Alert`,
              detail: `Vehicle health at ${v.health_pct}%`,
              remediation: { type: "maintenance", text: "Maintenance job auto-created", link: "/jobs" },
            });
          }
        });

        // Job-based alerts
        jobs.forEach((j) => {
          if (j.status === "dispatched" && j.priority === "high") {
            generated.push({
              severity: "info",
              message: `${j.job_id} Dispatched`,
              detail: `${j.title} for ${j.client}`,
            });
          }
          if (j.status === "completed") {
            generated.push({
              severity: "success",
              message: `${j.job_id} Completed`,
              detail: `${j.title} for ${j.client}`,
            });
          }
        });

        setAlerts(generated.slice(0, 8));
      } catch {
        setAlerts([]);
      } finally {
        setLoading(false);
      }
    }
    loadAlerts();
  }, []);

  const criticalCount = alerts.filter((a) => a.severity === "critical").length;

  return (
    <GlassCard level={2} className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-robur-steel">Alerts</h3>
        {criticalCount > 0 && (
          <span className="text-xs font-medium text-red-400">{criticalCount} critical</span>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 rounded-xl bg-robur-charcoal/[0.03] animate-pulse" />
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <p className="text-xs text-robur-steel/60 text-center py-8">No active alerts</p>
      ) : (
        <div className="space-y-2">
          {alerts.map((alert, i) => (
            <AlertCard key={i} alert={alert} onAction={(link) => link && (window.location.href = link)} />
          ))}
        </div>
      )}
    </GlassCard>
  );
}