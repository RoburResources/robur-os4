import { useState, useEffect } from "react";
import TopBar from "@/components/layout/TopBar";
import MetricCard from "@/components/ui/MetricCard";
import FleetOverview from "@/components/staff/FleetOverview";
import ActiveJobs from "@/components/staff/ActiveJobs";
import AlertsPanel from "@/components/staff/AlertsPanel";
import OperationsMap from "@/components/staff/OperationsMap";
import { motion } from "framer-motion";
import { Truck, Package, Clock, AlertTriangle } from "lucide-react";
import { base44 } from "@/api/base44Client";

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

export default function StaffDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMetrics() {
      try {
        const [vehicles, jobs] = await Promise.all([
          base44.entities.Vehicle.list(),
          base44.entities.Job.list(),
        ]);

        const activeVehicles = vehicles.filter((v) => v.status === "active").length;
        const activeJobs = jobs.filter((j) => j.status !== "completed" && j.status !== "created").length;
        const completedJobs = jobs.filter((j) => j.status === "completed").length;
        const maintenanceVehicles = vehicles.filter((v) => v.status === "maintenance").length;

        setMetrics({
          activeFleet: `${activeVehicles}/${vehicles.length}`,
          activeJobs,
          completedJobs,
          openAlerts: maintenanceVehicles,
        });
      } catch {
        setMetrics(null);
      } finally {
        setLoading(false);
      }
    }
    loadMetrics();
  }, []);

  return (
    <div className="max-w-7xl mx-auto">
      <TopBar title="Operations Centre" subtitle="Real-time overview" />

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <motion.div {...fadeIn} transition={{ delay: 0 }}>
          <MetricCard label="Active Fleet" value={loading ? "—" : metrics?.activeFleet ?? "0/0"} change={loading ? "Loading" : "Vehicles on road"} changeType="up" icon={Truck} />
        </motion.div>
        <motion.div {...fadeIn} transition={{ delay: 0.05 }}>
          <MetricCard label="Active Jobs" value={loading ? "—" : metrics?.activeJobs ?? 0} change={`${metrics?.completedJobs ?? 0} completed`} changeType="up" icon={Package} />
        </motion.div>
        <motion.div {...fadeIn} transition={{ delay: 0.1 }}>
          <MetricCard label="Completed Today" value={loading ? "—" : metrics?.completedJobs ?? 0} change="Jobs finished" changeType="up" icon={Clock} />
        </motion.div>
        <motion.div {...fadeIn} transition={{ delay: 0.15 }}>
          <MetricCard label="Vehicles in Maintenance" value={loading ? "—" : metrics?.openAlerts ?? 0} change={metrics?.openAlerts > 0 ? "Needs attention" : "All operational"} changeType={metrics?.openAlerts > 0 ? "down" : "up"} icon={AlertTriangle} />
        </motion.div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-12 gap-5">
        {/* Map */}
        <motion.div className="col-span-12 lg:col-span-7" {...fadeIn} transition={{ delay: 0.2 }}>
          <OperationsMap />
        </motion.div>

        {/* Fleet Status */}
        <motion.div className="col-span-12 lg:col-span-5" {...fadeIn} transition={{ delay: 0.25 }}>
          <FleetOverview />
        </motion.div>

        {/* Active Jobs */}
        <motion.div className="col-span-12 lg:col-span-7" {...fadeIn} transition={{ delay: 0.3 }}>
          <ActiveJobs />
        </motion.div>

        {/* Alerts */}
        <motion.div className="col-span-12 lg:col-span-5" {...fadeIn} transition={{ delay: 0.35 }}>
          <AlertsPanel />
        </motion.div>
      </div>
    </div>
  );
}