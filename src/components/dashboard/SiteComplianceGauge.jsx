import GlassCard from "@/components/ui/GlassCard";
import { Shield } from "lucide-react";
import { motion } from "framer-motion";

export default function SiteComplianceGauge({ pct = 92, sites = 18 }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <GlassCard level={2} className="p-5 h-full">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="h-4 w-4 text-robur-yellow" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-robur-steel">
          Site Compliance
        </h3>
      </div>
      <div className="flex items-center justify-center py-2">
        <div className="relative">
          <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke="rgba(0,0,0,0.06)"
              strokeWidth="9"
            />
            <motion.circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke="#FFC400"
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-robur-charcoal">{pct}%</span>
            <span className="text-[10px] text-robur-steel">{sites} sites</span>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}