import { useState, useEffect } from "react";
import GlassCard from "@/components/ui/GlassCard";
import StatusDot from "@/components/ui/StatusDot";
import { Truck, Fuel, Gauge } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function VehicleStatus() {
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadVehicle() {
      try {
        const me = await base44.auth.me();
        if (me?.full_name) {
          const vehicles = await base44.entities.Vehicle.filter({ driver: me.full_name });
          if (vehicles.length > 0) {
            setVehicle(vehicles[0]);
            setLoading(false);
            return;
          }
        }
        // Fallback: get the first active vehicle
        const active = await base44.entities.Vehicle.filter({ status: "active" }, "-updated_date", 1);
        if (active.length > 0) setVehicle(active[0]);
      } catch {
        setVehicle(null);
      } finally {
        setLoading(false);
      }
    }
    loadVehicle();
  }, []);

  const status = vehicle?.status === "active" ? "active" : vehicle?.status === "maintenance" ? "critical" : "idle";
  const fuelPct = vehicle?.fuel_pct ?? 0;
  const fuelColor = fuelPct < 20 ? "bg-red-400" : fuelPct < 50 ? "bg-amber-400" : "bg-emerald-400";

  return (
    <GlassCard level={2} hover className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-robur-steel">Your Vehicle</h3>
        {vehicle && <StatusDot status={status} label={vehicle.status} />}
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="h-14 rounded-xl bg-robur-charcoal/[0.03] animate-pulse" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-20 rounded-xl bg-robur-charcoal/[0.03] animate-pulse" />
            <div className="h-20 rounded-xl bg-robur-charcoal/[0.03] animate-pulse" />
          </div>
        </div>
      ) : !vehicle ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Truck className="h-8 w-8 text-robur-steel/30 mb-2" strokeWidth={1.5} />
          <p className="text-xs text-robur-steel/60">No vehicle assigned</p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-4 mb-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-robur-charcoal/5">
              <Truck className="h-7 w-7 text-robur-charcoal" strokeWidth={1.5} />
            </div>
            <div>
              <p className="font-semibold text-robur-charcoal tracking-tight">{vehicle.vehicle_id}</p>
              <p className="text-xs text-robur-steel">{vehicle.type}{vehicle.category ? ` · ${vehicle.category}` : ""}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-robur-charcoal/[0.03] p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Fuel className="h-3.5 w-3.5 text-robur-steel" strokeWidth={1.5} />
                <span className="text-[10px] font-medium text-robur-steel">Fuel</span>
              </div>
              <p className="text-lg font-bold text-robur-charcoal">{fuelPct}%</p>
              <div className="mt-1.5 h-1 rounded-full bg-robur-light/40 overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${fuelPct}%` }} className={fuelColor} />
              </div>
            </div>
            <div className="rounded-xl bg-robur-charcoal/[0.03] p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Gauge className="h-3.5 w-3.5 text-robur-steel" strokeWidth={1.5} />
                <span className="text-[10px] font-medium text-robur-steel">Odometer</span>
              </div>
              <p className="text-lg font-bold text-robur-charcoal">{(vehicle.odometer ?? 0).toLocaleString()}</p>
              <p className="text-[10px] text-robur-steel mt-0.5">km total</p>
            </div>
          </div>
        </>
      )}
    </GlassCard>
  );
}