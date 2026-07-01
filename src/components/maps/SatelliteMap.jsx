import { useEffect } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";

// Google Maps satellite tiles — support very deep zoom (up to 21)
const SATELLITE_TILES = "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}";
// Hybrid (satellite + labels) for better context at deep zoom
const HYBRID_TILES = "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}";

function MapController({ onReady }) {
  const map = useMap();
  useEffect(() => {
    if (onReady) onReady(map);
  }, [map, onReady]);
  return null;
}

export function MapViewController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView([center.lat, center.lng], zoom || map.getZoom());
  }, [map, center, zoom]);
  return null;
}

export default function SatelliteMap({
  center,
  zoom,
  children,
  onMapReady,
  className,
  hybrid = true,
  ...props
}) {
  return (
    <MapContainer
      key="satellite-map"
      center={[center.lat, center.lng]}
      zoom={zoom}
      minZoom={3}
      maxZoom={21}
      className={className}
      zoomControl={false}
      {...props}
    >
      <TileLayer
        url={hybrid ? HYBRID_TILES : SATELLITE_TILES}
        maxZoom={21}
        maxNativeZoom={21}
        attribution='&copy; Google'
      />
      {onMapReady && <MapController onReady={onMapReady} />}
      {children}
    </MapContainer>
  );
}