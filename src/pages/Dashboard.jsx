import { useState } from "react";
import TopBar from "@/components/layout/TopBar";
import WeatherHero from "@/components/dashboard/WeatherHero";
import VehicleStatus from "@/components/dashboard/VehicleStatus";
import TodaySchedule from "@/components/dashboard/TodaySchedule";
import RecentMessages from "@/components/dashboard/RecentMessages";
import QuickActions from "@/components/dashboard/QuickActions";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

export default function Dashboard() {
  const [pinned, setPinned] = useState({ weather: true, vehicle: true, schedule: true, messages: true, actions: true });

  const togglePin = (key) => setPinned((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="max-w-7xl mx-auto">
      <TopBar title="Driver Dashboard" subtitle="Your daily operations" />

      {/* Personalised widget toggle */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-robur-steel">Pinned:</span>
        {[
          { key: "weather", label: "Weather" },
          { key: "vehicle", label: "Vehicle" },
          { key: "schedule", label: "Schedule" },
          { key: "messages", label: "Messages" },
          { key: "actions", label: "Actions" },
        ].map((w) => (
          <button
            key={w.key}
            onClick={() => togglePin(w.key)}
            className={cn(
              "rounded-lg px-2.5 py-1 text-[10px] font-bold transition-colors",
              pinned[w.key]
                ? "bg-robur-yellow text-robur-charcoal"
                : "bg-robur-charcoal/5 text-robur-steel hover:bg-robur-charcoal/10"
            )}
          >
            {pinned[w.key] ? "📌 " : ""}{w.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-5">
        {pinned.weather && (
          <motion.div className="col-span-12 lg:col-span-8" {...fadeIn} transition={{ delay: 0 }}>
            <WeatherHero />
          </motion.div>
        )}
        {pinned.vehicle && (
          <motion.div className={cn("col-span-12", pinned.weather ? "lg:col-span-4" : "lg:col-span-12")} {...fadeIn} transition={{ delay: 0.05 }}>
            <VehicleStatus />
          </motion.div>
        )}
        {pinned.schedule && (
          <motion.div className="col-span-12 lg:col-span-5" {...fadeIn} transition={{ delay: 0.1 }}>
            <TodaySchedule />
          </motion.div>
        )}
        {pinned.messages && (
          <motion.div className="col-span-12 lg:col-span-4" {...fadeIn} transition={{ delay: 0.15 }}>
            <RecentMessages />
          </motion.div>
        )}
        {pinned.actions && (
          <motion.div className="col-span-12 lg:col-span-3" {...fadeIn} transition={{ delay: 0.2 }}>
            <QuickActions />
          </motion.div>
        )}
      </div>
    </div>
  );
}