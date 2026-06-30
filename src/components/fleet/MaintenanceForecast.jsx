import { useMemo } from "react";
import { motion } from "framer-motion";
import GlassCard from "@/components/ui/GlassCard";
import { Wrench, TrendingDown, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * MaintenanceForecast — visual timeline showing when each vehicle is
 * predicted to need maintenance based on health_pct, odometer, and
 * next_service date. Shifts management from reactive to proactive.
 */

function predictMaintenanceDate(vehicle) {
  if (!vehicle) return null;

  // If next_service is set, use it as the baseline
  let targetDate = vehicle.next_service ? new Date(vehicle.next_service) : null;

  // Factor in health score — lower health = sooner
  const health = vehicle.health_pct ?? 100;
  const odometer = vehicle.odometer ?? 0;

  if (!targetDate) {
    // Default: 30 days from now, adjusted by health
    const daysOffset = Math.max(3, Math.round((health / 100) * 30));
    targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysOffset);
  } else {
    // If health is below 50, pull forward
    if (health < 50) {
      targetDate.setDate(targetDate.getDate() - 7);
    }
  }

  return targetDate;
}

function getUrgency(vehicle, targetDate) {
  const now = new Date();
  const daysUntil = Math.round((targetDate - now) / (1000 * 60 * 60 * 24));
  const health = vehicle?.health_pct ?? 100;

  if (daysUntil <= 0 || health < 40) return { level: "critical", label: "Overdue", color: "text-red-500", bg: "bg-red-50", border: "border-red-200", dot: "bg-red-500" };
  if (daysUntil <= 7 || health < 60) return { level: "soon", label: `${daysUntil}d`, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", dot: "bg-amber-400" };
  if (daysUntil <= 21) return { level: "upcoming", label: `${daysUntil}d`, color: "text-sky-500", bg: "bg-sky-50", border: "border-sky-200", dot: "bg-sky-400" };
  return { level: "healthy", label: "Healthy", color: "text-emerald-500", bg: "bg-emerald-50", border: "border-emerald-200", dot: "bg-emerald-400" };
}

export default function MaintenanceForecast({ vehicles = [] }) {
  const forecast = useMemo(() => {
    return vehicles
      .map((v) => {
        const targetDate = predictMaintenanceDate(v);
        const urgency = getUrgency(v, targetDate);
        return { vehicle: v, targetDate, urgency };
      })
      .sort((a, b) => a.targetDate - b.targetDate);
  }, [vehicles]);

  const criticalCount = forecast.filter((f) => f.urgency.level === "critical").length;
  const soonCount = forecast.filter((f) => f.urgency.level === "soon").length;

  return (
    <GlassCard level={2} className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-robur-yellow/15">
            <Wrench className="h-3.5 w-3.5 text-robur-yellow" strokeWidth={2} />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-robur-charcoal">Maintenance Forecast</h3>
            <p className="text-[9px] text-robur-steel">Predictive scheduling based on health & usage</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {criticalCount > 0 && (
            <span className="flex items-center gap-1 rounded-md bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-500">
              <AlertCircle className="h-2.5 w-2.5" /> {criticalCount} overdue
            </span>
          )}
          {soonCount > 0 && (
            <span className="flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-600">
              <TrendingDown className="h-2.5 w-2.5" /> {soonCount} soon
            </span>
          )}
        </div>
      </div>

      {forecast.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6">
          <CheckCircle2 className="h-8 w-8 text-emerald-400 mb-2" strokeWidth={1.5} />
          <p className="text-xs text-robur-steel">No vehicles to forecast</p>
        </div>
      ) : (
        <div className="space-y-2">
          {forecast.slice(0, 6).map((f, i) => (
            <motion.div
              key={f.vehicle.id || i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={cn("flex items-center gap-3 rounded-xl border p-2.5", f.urgency.border, f.urgency.bg)}
            >
              <span className={cn("h-2 w-2 rounded-full shrink-0", f.urgency.dot)} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-robur-charcoal truncate">{f.vehicle.vehicle_id}</p>
                <p className="text-[10px] text-robur-steel">
                  {f.vehicle.type} · {f.vehicle.odometer?.toLocaleString() || "—"} km · {f.vehicle.health_pct ?? "—"}% health
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className={cn("text-xs font-bold", f.urgency.color)}>{f.urgency.label}</p>
                <p className="text-[9px] text-robur-steel">
                  {f.targetDate.toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}