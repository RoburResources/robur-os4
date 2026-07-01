import { useState, useEffect } from "react";
import TopBar from "@/components/layout/TopBar";
import GlassCard from "@/components/ui/GlassCard";
import SemanticStatus from "@/components/ui/SemanticStatus";
import SatelliteMap from "@/components/maps/SatelliteMap";
import { Marker, Tooltip } from "react-leaflet";
import L from "leaflet";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Layers, Maximize2, Plus, Minus, Truck, ChevronRight } from "lucide-react";
import { base44 } from "@/api/base44Client";

const MELB_CENTER = { lat: -37.82, lng: 144.88 };

const createVehicleIcon = (status) =>
  L.divIcon({
    className: "",
    html: `<div style="
      width: 36px; height: 36px;
      background: ${status === "active" ? "#FFC400" : status === "maintenance" ? "#F59E0B" : "#5E6770"};
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 0 0 4px rgba(255,255,255,0.25), 0 4px 12px rgba(0,0,0,0.4);
      border: 2px solid white;
    ">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${status === "idle" ? "#fff" : "#22262B"}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>
      </svg>
    </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });

export default function MapView() {
  const [map, setMap] = useState(null);
  const [activeVehicle, setActiveVehicle] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Vehicle.list()
      .then((data) => {
        setVehicles(data.filter((v) => v.latitude != null && v.longitude != null));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleVehicleClick = (v) => {
    setActiveVehicle(v.id);
    if (map) map.setView([v.latitude, v.longitude], 15, { animate: true });
  };

  return (
    <div className="max-w-7xl mx-auto">
      <TopBar title="Live Map" subtitle="Real-time fleet tracking" />

      <div className="grid grid-cols-12 gap-5">
        {/* Map */}
        <motion.div
          className="col-span-12 lg:col-span-8"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <GlassCard
            level={1}
            className="relative overflow-hidden"
            style={{ height: "calc(100vh - 180px)" }}
          >
            <SatelliteMap
              center={MELB_CENTER}
              zoom={12}
              onMapReady={setMap}
              className="h-full w-full"
            >
              {vehicles.map((v) => (
                <Marker
                  key={v.id}
                  position={[v.latitude, v.longitude]}
                  icon={createVehicleIcon(v.status)}
                  eventHandlers={{ click: () => handleVehicleClick(v) }}
                >
                  <Tooltip direction="top" offset={[0, -12]}>
                    {`${v.vehicle_id}${v.driver ? ` · ${v.driver}` : ""}`}
                  </Tooltip>
                </Marker>
              ))}
            </SatelliteMap>

            {/* Floating top controls */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-[1000] pointer-events-none">
              <GlassCard level={3} className="px-3 py-1.5 pointer-events-auto">
                <span className="text-[10px] font-semibold text-robur-charcoal uppercase tracking-wider">
                  Fleet Map
                </span>
              </GlassCard>
              <div className="flex gap-1.5 pointer-events-auto">
                <GlassCard level={3} className="h-9 w-9 flex items-center justify-center cursor-pointer hover:bg-white transition-colors">
                  <Layers className="h-4 w-4 text-robur-steel" strokeWidth={1.5} />
                </GlassCard>
                <GlassCard level={3} className="h-9 w-9 flex items-center justify-center cursor-pointer hover:bg-white transition-colors">
                  <Maximize2 className="h-4 w-4 text-robur-steel" strokeWidth={1.5} />
                </GlassCard>
              </div>
            </div>

            {/* Zoom controls */}
            <div className="absolute bottom-4 right-4 z-[1000] flex flex-col gap-1.5">
              <GlassCard
                level={3}
                className="h-9 w-9 flex items-center justify-center cursor-pointer hover:bg-white transition-colors"
                onClick={() => map?.zoomIn()}
              >
                <Plus className="h-4 w-4 text-robur-steel" strokeWidth={2} />
              </GlassCard>
              <GlassCard
                level={3}
                className="h-9 w-9 flex items-center justify-center cursor-pointer hover:bg-white transition-colors"
                onClick={() => map?.zoomOut()}
              >
                <Minus className="h-4 w-4 text-robur-steel" strokeWidth={2} />
              </GlassCard>
            </div>
          </GlassCard>
        </motion.div>

        {/* Vehicle List */}
        <motion.div
          className="col-span-12 lg:col-span-4"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <GlassCard
            level={2}
            className="p-5 overflow-y-auto"
            style={{ height: "calc(100vh - 180px)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-robur-steel">
                Vehicles
              </h3>
              <span className="text-[10px] text-robur-steel/50">
                {loading ? "Loading..." : `${vehicles.length} tracked`}
              </span>
            </div>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <div key={i} className="h-14 rounded-xl bg-robur-charcoal/[0.03] animate-pulse" />)}
              </div>
            ) : vehicles.length === 0 ? (
              <p className="text-xs text-robur-steel/60 text-center py-8">No vehicles with GPS coordinates</p>
            ) : (
              <div className="space-y-2">
                {vehicles.map((v) => (
                  <div
                    key={v.id}
                    onClick={() => handleVehicleClick(v)}
                    className={cn(
                      "group flex items-center gap-3 rounded-xl p-3 transition-colors cursor-pointer",
                      activeVehicle === v.id
                        ? "bg-robur-yellow/10"
                        : "hover:bg-robur-charcoal/[0.03]"
                    )}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-robur-charcoal/5">
                      <Truck className="h-5 w-5 text-robur-charcoal" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-robur-charcoal">
                          {v.vehicle_id}
                        </span>
                        <SemanticStatus status={v.status} size="xs" />
                      </div>
                      <p className="text-[10px] text-robur-steel">
                        {v.driver || "Unassigned"} · {v.type || "—"}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-robur-light opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
}