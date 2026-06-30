import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Navigation, FileText, MapPin, X } from "lucide-react";

export default function QuickActionMenu() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Context-sensitive actions based on current page
  const getActions = () => {
    const path = location.pathname;
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
    return [
      { label: "New Booking", icon: Plus, action: () => navigate("/booking") },
      { label: "View Map", icon: MapPin, action: () => navigate("/map") },
      { label: "Daily Log", icon: FileText, action: () => navigate("/daily-log") },
    ];
  };

  const actions = getActions();

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
        className="flex h-12 w-12 items-center justify-center rounded-full bg-robur-yellow shadow-lg glow-yellow"
      >
        {open ? (
          <X className="h-5 w-5 text-robur-charcoal" strokeWidth={2.5} />
        ) : (
          <Plus className="h-5 w-5 text-robur-charcoal" strokeWidth={2.5} />
        )}
      </motion.button>
    </div>
  );
}