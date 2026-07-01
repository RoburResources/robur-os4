import GlassCard from "@/components/ui/GlassCard";
import { cn } from "@/lib/utils";
import { Wrench, ShieldCheck, Clock, Gauge } from "lucide-react";

export default function ServiceReminders({ vehicle }) {
  const reminders = [];

  if (vehicle?.next_service) {
    const serviceDate = new Date(vehicle.next_service);
    const now = new Date();
    const daysUntil = Math.round((serviceDate - now) / (1000 * 60 * 60 * 24));
    reminders.push({
      label: "Next Service",
      value: vehicle.next_service,
      flag: daysUntil <= 7 ? "DUE SOON" : "UPCOMING",
      icon: Wrench,
    });
  }

  if (vehicle?.rego) {
    reminders.push({
      label: "Registration",
      value: vehicle.rego,
      flag: "ACTIVE",
      icon: ShieldCheck,
    });
  }

  if (vehicle?.odometer != null) {
    reminders.push({
      label: "Odometer",
      value: `${vehicle.odometer.toLocaleString()} km`,
      flag: vehicle.odometer > 200000 ? "HIGH" : "NORMAL",
      icon: Gauge,
    });
  }

  if (vehicle?.status === "maintenance") {
    reminders.push({
      label: "Status",
      value: "In Maintenance",
      flag: "ACTIVE",
      icon: Clock,
    });
  }

  return (
    <GlassCard level={2} className="p-5">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-robur-steel mb-4">Service Reminders</h3>
      {!vehicle ? (
        <p className="text-xs text-robur-steel/60 text-center py-8">Select a vehicle to view reminders</p>
      ) : reminders.length === 0 ? (
        <p className="text-xs text-robur-steel/60 text-center py-8">No service reminders configured</p>
      ) : (
        <div className="space-y-2">
          {reminders.map((r) => (
            <div key={r.label} className="flex items-center gap-3 rounded-xl bg-robur-charcoal/[0.03] p-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/60">
                <r.icon className="h-4 w-4 text-robur-steel" strokeWidth={1.5} />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-robur-charcoal">{r.label}</p>
                <p className="text-[10px] text-robur-steel">{r.value}</p>
              </div>
              <span className={cn(
                "rounded-md px-2 py-0.5 text-[9px] font-bold",
                r.flag === "DUE SOON" ? "bg-amber-50 text-amber-600"
                : r.flag === "HIGH" ? "bg-red-50 text-red-500"
                : "bg-robur-charcoal/5 text-robur-steel"
              )}>
                {r.flag}
              </span>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}