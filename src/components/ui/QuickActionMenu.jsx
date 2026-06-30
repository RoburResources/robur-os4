import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Navigation, FileText, MapPin, X,
  Truck, Wrench, ArrowRight, Camera
} from "lucide-react";

/**
 * QuickActionMenu — persistent, context-aware floating action button.
 * Listens for `robur:context` custom events from pages to tailor actions
 * to the specific asset/job currently being viewed.
 */

window.__roburContext = null;

export function setActionContext(ctx) {
  window.__roburContext = ctx;
  window.dispatchEvent(new CustomEvent("robur:context", { detail: ctx }));
}

export default function QuickActionMenu() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [context, setContext] = useState(null);

  useEffect(() => {
    const handler = (e) => setContext(e.detail);
    window.addEventListener("robur:context", handler);
    return () => window.removeEventListener("robur:context", handler);
  }, []);

  // Reset context on route change
  useEffect(() => {
    setContext(null);
    window.__roburContext = null;
  }, [location.pathname]);

  const getActions = () => {
    const path = location.pathname;

    // Context-aware: if a specific job/vehicle is selected
    if (context?.type === "job") {
      return [
        { label: "View on Map", icon: MapPin, action: () => navigate("/map") },
        { label: "Assign Driver", icon: Truck, action: () => navigate("/jobs") },
        { label: "Add Note", icon: FileText, action: () => navigate("/daily-log") },
      ];
    }
    if (context?.type === "vehicle") {
      return [
        { label: "Log Service", icon: Wrench, action: () => navigate("/fleet") },
        { label: "View on Map", icon: MapPin, action: () => navigate("/map") },
        { label: "Assign Job", icon: Plus, action: () => navigate("/booking") },
      ];
    }

    // Page-aware fallback
    if (path === "/jobs" || path === "/driver") {
      return [
        { label: "New Job", icon: Plus, action: () => navigate("/booking") },
        { label: "View Map", icon: MapPin, action: () => navigate("/map") },
        { label: "Daily Log", icon: FileText, action: () => navigate("/daily-log") },
      ];
    }
    if (path === "/fleet" || path === "/map") {
      return [
        { label: "New Job", icon: Plus, action: () => navigate("/booking") },
        { label: "Navigate", icon: Navigation, action: () => navigate("/map") },
        { label: "Daily Log", icon: FileText, action: () => navigate("/daily-log") },
      ];
    }
    if (path === "/documents") {
      return [
        { label: "Capture Docket", icon: Camera, action: () => navigate("/documents") },
        { label: "New Booking", icon: Plus, action: () => navigate("/booking") },
        { label: "Daily Log", icon: FileText, action: () => navigate("/daily-log") },
      ];
    }
    return [
      { label: "New Booking", icon: Plus, action: () => navigate("/booking") },
      { label: "View Map", icon: MapPin, action: () => navigate("/map") },
      { label: "Daily Log", icon: FileText, action: () => navigate("/daily-log") },
    ];
  };

  const actions = getActions();
  const hasContext = !!context;

  return (
    <div className="fixed bottom-20 right-4 z-50 lg:hidden">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-14 right-0 space-y-2"
          >
            {actions.map((a, i) => (
              <motion.button
                key={a.label}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => {
                  a.action();
                  setOpen(false);
                }}
                className="flex items-center gap-3 rounded-xl glass-3 px-4 py-2.5 shadow-lg active:scale-95 transition-transform"
              >
                <a.icon className="h-4 w-4 text-robur-charcoal" strokeWidth={2} />
                <span className="text-sm font-semibold text-robur-charcoal">{a.label}</span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setOpen(!open)}
        className={`flex h-12 w-12 items-center justify-center rounded-full shadow-lg glow-yellow transition-colors ${
          hasContext ? "bg-robur-charcoal" : "bg-robur-yellow"
        }`}
      >
        {open ? (
          <X className="h-5 w-5 text-robur-yellow" strokeWidth={2.5} />
        ) : hasContext ? (
          <ArrowRight className="h-5 w-5 text-robur-yellow" strokeWidth={2.5} />
        ) : (
          <Plus className="h-5 w-5 text-robur-charcoal" strokeWidth={2.5} />
        )}
      </motion.button>
    </div>
  );
}