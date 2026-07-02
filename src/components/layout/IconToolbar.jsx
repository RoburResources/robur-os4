import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Gauge, Activity, LayoutDashboard, Truck, Package, Box, FileStack,
  FileText, Users, CreditCard, Percent, Receipt, Bot, Award, Shield,
  ClipboardList, FileCheck, BarChart3, Lock, LogOut,
} from "lucide-react";
import { base44 } from "@/api/base44Client";

const heroCategories = [
  {
    id: "command",
    label: "Command",
    icon: Gauge,
    items: [
      { label: "Executive", icon: LayoutDashboard, path: "/" },
      { label: "Operations", icon: Activity, path: "/operations" },
      { label: "Driver", icon: LayoutDashboard, path: "/driver" },
    ],
  },
  {
    id: "field",
    label: "Field Ops",
    icon: Truck,
    items: [
      { label: "Fleet", icon: Truck, path: "/fleet" },
      { label: "Jobs", icon: Package, path: "/jobs" },
      { label: "Bins", icon: Box, path: "/bins" },
      { label: "Documents", icon: FileStack, path: "/documents" },
      { label: "Daily Log", icon: FileText, path: "/daily-log" },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    icon: CreditCard,
    items: [
      { label: "Clients", icon: Users, path: "/clients" },
      { label: "Payments", icon: CreditCard, path: "/finance" },
      { label: "Margins", icon: Percent, path: "/margins" },
      { label: "Reconciliation", icon: Receipt, path: "/reconciliation" },
    ],
  },
  {
    id: "intel",
    label: "Intelligence",
    icon: BarChart3,
    items: [
      { label: "Drivers", icon: Award, path: "/drivers" },
      { label: "Compliance", icon: Shield, path: "/compliance" },
      { label: "DMT", icon: ClipboardList, path: "/dmt" },
      { label: "MGT", icon: FileCheck, path: "/mgt" },
      { label: "DSS", icon: BarChart3, path: "/dss" },
      { label: "Booking Agent", icon: Bot, path: "/agent-chat" },
    ],
  },
];

export default function IconToolbar() {
  const location = useLocation();
  const [hovered, setHovered] = useState(null);

  const activeCategory = heroCategories.find((cat) =>
    cat.items.some((item) => location.pathname === item.path)
  )?.id;

  return (
    <div className="sticky top-8 flex flex-col items-center gap-2 w-14 self-start z-30">
      {/* Brand */}
      <Link
        to="/"
        className="flex h-11 w-11 items-center justify-center rounded-2xl bg-robur-yellow shadow-lg glow-yellow mb-1 transition-transform hover:scale-105 active:scale-95"
      >
        <Lock className="h-5 w-5 text-robur-charcoal" strokeWidth={2.5} />
      </Link>

      {/* Hero category icons */}
      <nav className="flex flex-col items-center gap-1 p-1.5 rounded-2xl glass-2">
        {heroCategories.map((cat) => {
          const isActive = activeCategory === cat.id;
          const isHovered = hovered === cat.id;
          return (
            <div
              key={cat.id}
              className="relative"
              onMouseEnter={() => setHovered(cat.id)}
              onMouseLeave={() => setHovered(null)}
            >
              <button
                className={cn(
                  "relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200",
                  isActive
                    ? "bg-robur-yellow/15 text-robur-yellow"
                    : isHovered
                    ? "bg-robur-charcoal/8 text-robur-charcoal"
                    : "text-robur-steel hover:bg-robur-charcoal/5"
                )}
              >
                <cat.icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 1.5} />
                {isActive && (
                  <span className="absolute -left-1.5 h-1.5 w-1.5 rounded-full bg-robur-yellow" />
                )}
              </button>

              {/* Flyout panel */}
              <AnimatePresence>
                {isHovered && (
                  <motion.div
                    initial={{ opacity: 0, x: -8, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-full ml-3 top-0 z-[1000] min-w-[190px] p-2 rounded-2xl glass-3"
                  >
                    <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-robur-steel">
                      {cat.label}
                    </p>
                    <div className="space-y-0.5">
                      {cat.items.map((item) => {
                        const itemActive = location.pathname === item.path;
                        return (
                          <Link
                            key={item.path}
                            to={item.path}
                            className={cn(
                              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                              itemActive
                                ? "bg-robur-yellow/10 text-robur-charcoal"
                                : "text-robur-steel hover:bg-robur-charcoal/5 hover:text-robur-charcoal"
                            )}
                          >
                            <item.icon className="h-4 w-4" strokeWidth={1.5} />
                            {item.label}
                          </Link>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="flex flex-col items-center gap-1 p-1.5 rounded-2xl glass-2">
        <button
          onClick={() => base44.auth.logout()}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-robur-steel hover:bg-red-50 hover:text-red-500 transition-all active:scale-95"
          title="Sign Out"
        >
          <LogOut className="h-5 w-5" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}