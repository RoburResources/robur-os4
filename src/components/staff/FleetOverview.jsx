import { useState, useEffect } from "react";
import GlassCard from "@/components/ui/GlassCard";
import StatusDot from "@/components/ui/StatusDot";
import { Truck } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function FleetOverview() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Vehicle.list("-updated_date", 20)
      .then(setVehicles)
      .catch(() => setVehicles([]))
      .finally(() => setLoading(false));
  }, []);

  const activeCount = vehicles.filter((v) => v.status === "active").length;

  const statusFor = (v) => {
    if (v.status === "active") return "active";
    if (v.status === "maintenance") return "critical";
    return "idle";
  };

  return (
    <GlassCard level={2} className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-robur-steel">Fleet Status</h3>
        {!loading && vehicles.length > 0 && (
          <span className="text-xs font-medium text-emerald-500">{activeCount}/{vehicles.length} active</span>
        )}
      </div>

      {loading ? (
        <div className="space-y-1.5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 rounded-xl bg-robur-charcoal/[0.03] animate-pulse" />
          ))}
        </div>
      ) : vehicles.length === 0 ? (
        <p className="text-xs text-robur-steel/60 text-center py-8">No vehicles registered</p>
      ) : (
        <div className="space-y-1.5">
          {vehicles.map((v) => (
            <div
              key={v.id}
              className="group flex items-center gap-3 rounded-xl p-2.5 hover:bg-robur-charcoal/[0.03] transition-colors cursor-pointer"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-robur-charcoal/5">
                <Truck className="h-4 w-4 text-robur-charcoal" strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-robur-charcoal">{v.vehicle_id}</span>
                  {v.driver && (
                    <>
                      <span className="text-[10px] text-robur-steel/50">·</span>
                      <span className="text-[10px] text-robur-steel">{v.driver}</span>
                    </>
                  )}
                </div>
                <p className="text-[10px] text-robur-steel/60 truncate">{v.type}{v.status === "maintenance" ? " · In Maintenance" : v.status === "idle" ? " · At Depot" : ""}</p>
              </div>
              <StatusDot status={statusFor(v)} size="sm" />
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}