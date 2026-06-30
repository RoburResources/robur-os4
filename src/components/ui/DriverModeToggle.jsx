import { useState, useEffect } from "react";
import { Car } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Driver Mode — shifts typography scale and tap target sizes for in-vehicle use.
 * Higher contrast, larger text, simplified layout. Toggles a class on <html>.
 */

const STORAGE_KEY = "robur_driver_mode";

export function useDriverMode() {
  const [enabled, setEnabled] = useState(() => localStorage.getItem(STORAGE_KEY) === "true");

  useEffect(() => {
    const root = document.documentElement;
    if (enabled) root.classList.add("driver-mode");
    else root.classList.remove("driver-mode");
    localStorage.setItem(STORAGE_KEY, String(enabled));
  }, [enabled]);

  return { enabled, toggle: () => setEnabled((p) => !p) };
}

export default function DriverModeToggle({ className }) {
  const { enabled, toggle } = useDriverMode();

  return (
    <button
      onClick={toggle}
      className={cn(
        "flex items-center gap-1.5 rounded-xl px-2.5 py-2 transition-colors",
        enabled ? "bg-robur-yellow/20 ring-2 ring-robur-yellow/40" : "glass-2 hover:bg-white/90",
        className
      )}
      title={enabled ? "Driver Mode active — tap to disable" : "Enable Driver Mode for in-vehicle use"}
    >
      <Car
        className={cn("h-4 w-4 transition-colors", enabled ? "text-robur-charcoal" : "text-robur-steel")}
        strokeWidth={2}
      />
      {enabled && <span className="text-[10px] font-bold text-robur-charcoal">Driver</span>}
    </button>
  );
}