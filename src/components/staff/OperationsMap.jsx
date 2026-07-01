import { useState, useEffect } from "react";
import GlassCard from "@/components/ui/GlassCard";
import { Maximize2, Layers, Navigation } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function OperationsMap() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Vehicle.list()
      .then(setVehicles)
      .catch(() => setVehicles([]))
      .finally(() => setLoading(false));
  }, []);

  const onRoad = vehicles.filter((v) => v.status === "active").length;
  const atDepot = vehicles.filter((v) => v.status === "idle").length;
  const inMaint = vehicles.filter((v) => v.status === "maintenance").length;

  // Position markers in a pseudo-grid based on index
  const positions = [
    { top: "25%", left: "20%" },
    { top: "50%", right: "30%" },
    { top: "65%", left: "45%" },
    { top: "35%", left: "60%" },
    { top: "55%", right: "15%" },
  ];

  return (
    <GlassCard level={1} className="relative overflow-hidden" style={{ height: "320px" }}>
      {/* Map placeholder */}
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?w=1200&q=80"
          alt="Satellite map view"
          className="w-full h-full object-cover grayscale brightness-110 contrast-95"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent" />
      </div>

      {/* Floating glass controls */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
        <GlassCard level={3} className="px-3 py-1.5">
          <span className="text-[10px] font-semibold text-robur-charcoal uppercase tracking-wider">Live Fleet Map</span>
        </GlassCard>
        <div className="flex gap-1.5">
          <GlassCard level={3} className="flex h-7 w-7 items-center justify-center cursor-pointer hover:bg-white transition-colors">
            <Layers className="h-3.5 w-3.5 text-robur-steel" strokeWidth={1.5} />
          </GlassCard>
          <GlassCard level={3} className="flex h-7 w-7 items-center justify-center cursor-pointer hover:bg-white transition-colors">
            <Maximize2 className="h-3.5 w-3.5 text-robur-steel" strokeWidth={1.5} />
          </GlassCard>
        </div>
      </div>

      {/* Vehicle markers — only render vehicles with GPS coordinates */}
      {!loading && vehicles
        .filter((v) => v.latitude != null && v.longitude != null)
        .slice(0, 6)
        .map((v, i) => {
          const pos = positions[i % positions.length];
          const color = v.status === "active" ? "bg-robur-yellow" : v.status === "maintenance" ? "bg-red-400" : "bg-robur-steel";
          return (
            <div key={v.id} className="absolute" style={pos}>
              <div className="relative">
                <div className={`h-6 w-6 rounded-full ${color} flex items-center justify-center shadow-lg`}>
                  <Navigation className="h-3 w-3 text-robur-charcoal" strokeWidth={2} />
                </div>
                <GlassCard level={3} className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap px-1.5 py-0.5">
                  <span className="text-[8px] font-bold text-robur-charcoal">{v.vehicle_id}</span>
                </GlassCard>
              </div>
            </div>
          );
        })}

      {/* Bottom stats */}
      <div className="absolute bottom-3 left-3 right-3 flex gap-2">
        <GlassCard level={3} className="flex-1 px-3 py-2 text-center">
          <p className="text-lg font-bold text-robur-charcoal">{loading ? "—" : onRoad}</p>
          <p className="text-[9px] text-robur-steel">On Road</p>
        </GlassCard>
        <GlassCard level={3} className="flex-1 px-3 py-2 text-center">
          <p className="text-lg font-bold text-robur-charcoal">{loading ? "—" : atDepot}</p>
          <p className="text-[9px] text-robur-steel">At Depot</p>
        </GlassCard>
        <GlassCard level={3} className="flex-1 px-3 py-2 text-center">
          <p className="text-lg font-bold text-robur-charcoal">{loading ? "—" : inMaint}</p>
          <p className="text-[9px] text-red-400">Maint.</p>
        </GlassCard>
      </div>
    </GlassCard>
  );
}