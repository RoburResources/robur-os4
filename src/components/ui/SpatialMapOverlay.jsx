import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Map as MapIcon, Maximize2, Minimize2, X } from "lucide-react";
import SatelliteMap from "@/components/maps/SatelliteMap";
import { Marker, Tooltip } from "react-leaflet";
import L from "leaflet";
import { cn } from "@/lib/utils";

/**
 * SpatialMapOverlay — persistent floating mini-map that gives geographic context
 * on operational pages (Jobs, Fleet, Daily Log). Expandable to full view.
 * The map is the "anchor"; panels overlay on top of it.
 */

const vehicleData = [
  { id: "ROB-101", driver: "James D.", location: "Tottenham", status: "active", coords: [-37.798, 144.865] },
  { id: "ROB-108", driver: "Mark S.", location: "Wyndham", status: "active", coords: [-37.874, 144.657] },
  { id: "ROB-115", driver: "Sarah L.", location: "Melbourne CBD", status: "warning", coords: [-37.8136, 144.9631] },
  { id: "ROB-130", driver: "David W.", location: "Sunshine", status: "active", coords: [-37.788, 144.831] },
  { id: "ROB-122", driver: "Tom R.", location: "Laverton Depot", status: "idle", coords: [-37.852, 144.743] },
];

const showOnRoutes = ["/jobs", "/fleet", "/daily-log", "/driver", "/operations"];

const createIcon = (status, size = 28) =>
  L.divIcon({
    className: "",
    html: `<div style="width:${size}px;height:${size}px;background:${status === "active" ? "#FFC400" : status === "warning" ? "#F59E0B" : "#5E6770"};border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 3px rgba(255,255,255,0.2),0 2px 8px rgba(0,0,0,0.3);border:2px solid white;"><svg width="${size * 0.5}px" height="${size * 0.5}px" viewBox="0 0 24 24" fill="none" stroke="${status === "idle" ? "#fff" : "#22262B"}" stroke-width="2"><path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });

export default function SpatialMapOverlay() {
  const location = useLocation();
  const [expanded, setExpanded] = useState(false);
  const [map, setMap] = useState(null);
  const shouldShow = showOnRoutes.includes(location.pathname);

  if (!shouldShow) return null;

  return (
    <div className={cn(
      "fixed z-40 transition-all duration-300",
      expanded
        ? "inset-2 lg:inset-4 lg:left-68"
        : "bottom-20 right-4 h-32 w-32 lg:bottom-6 lg:right-6 lg:h-40 lg:w-56"
    )}>
      <AnimatePresence mode="wait">
        {expanded ? (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="relative h-full w-full overflow-hidden rounded-2xl glass-3"
          >
            <SatelliteMap
              center={{ lat: -37.82, lng: 144.88 }}
              zoom={12}
              onMapReady={setMap}
              className="h-full w-full"
            >
              {vehicleData.map((v) => (
                <Marker key={v.id} position={v.coords} icon={createIcon(v.status, 36)}>
                  <Tooltip direction="top" offset={[0, -12]}>
                    {`${v.id} · ${v.driver} · ${v.location}`}
                  </Tooltip>
                </Marker>
              ))}
            </SatelliteMap>

            <div className="absolute top-3 left-3 z-[1000]">
              <div className="rounded-lg glass-3 px-3 py-1.5">
                <span className="text-[10px] font-bold text-robur-charcoal uppercase tracking-wider">
                  Live Fleet · {vehicleData.length} vehicles
                </span>
              </div>
            </div>

            <button
              onClick={() => setExpanded(false)}
              className="absolute top-3 right-3 z-[1000] flex h-9 w-9 items-center justify-center rounded-lg glass-3 hover:bg-white transition-colors"
            >
              <Minimize2 className="h-4 w-4 text-robur-steel" strokeWidth={2} />
            </button>
          </motion.div>
        ) : (
          <motion.button
            key="mini"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => setExpanded(true)}
            className="group relative h-full w-full overflow-hidden rounded-2xl glass-2 cursor-pointer hover:ring-2 hover:ring-robur-yellow/40 transition-all"
          >
            <SatelliteMap
              center={{ lat: -37.82, lng: 144.88 }}
              zoom={11}
              className="h-full w-full"
            >
              {vehicleData.map((v) => (
                <Marker key={v.id} position={v.coords} icon={createIcon(v.status, 20)} />
              ))}
            </SatelliteMap>

            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />

            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5 rounded-lg bg-white/90 px-2 py-1 backdrop-blur-sm">
                <MapIcon className="h-3 w-3 text-robur-charcoal" strokeWidth={2} />
                <span className="text-[9px] font-bold text-robur-charcoal">Live Map</span>
              </div>
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/90 backdrop-blur-sm">
                <Maximize2 className="h-3 w-3 text-robur-steel" strokeWidth={2} />
              </div>
            </div>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}