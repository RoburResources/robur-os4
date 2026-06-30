import GlassCard from "@/components/ui/GlassCard";
import MetricCard from "@/components/ui/MetricCard";
import { FileStack, Package, StickyNote, Clock } from "lucide-react";
import { motion } from "framer-motion";

const fadeIn = { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 } };

export default function ShiftStats({ dockets, totalNetWeight, totalGross, notes, hoursWorked, loading }) {
  const fmtWeight = (w) => {
    if (w >= 1000) return `${(w / 1000).toFixed(1)}t`;
    return `${Math.round(w)}kg`;
  };

  const fmtHours = (h) => {
    const hrs = Math.floor(h);
    const mins = Math.round((h - hrs) * 60);
    return `${hrs}h ${mins}m`;
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <motion.div {...fadeIn} transition={{ delay: 0 }}>
        <MetricCard label="Dockets Completed" value={loading ? "—" : String(dockets)} icon={FileStack} />
      </motion.div>
      <motion.div {...fadeIn} transition={{ delay: 0.05 }}>
        <MetricCard label="Net Material" value={loading ? "—" : fmtWeight(totalNetWeight)} icon={Package} />
      </motion.div>
      <motion.div {...fadeIn} transition={{ delay: 0.1 }}>
        <MetricCard label="Service Notes" value={loading ? "—" : String(notes)} icon={StickyNote} />
      </motion.div>
      <motion.div {...fadeIn} transition={{ delay: 0.15 }}>
        <MetricCard label="Time on Shift" value={loading ? "—" : fmtHours(hoursWorked)} icon={Clock} />
      </motion.div>
    </div>
  );
}