import { useState, useEffect } from "react";
import TopBar from "@/components/layout/TopBar";
import GlassCard from "@/components/ui/GlassCard";
import { motion } from "framer-motion";
import { FileText, Download, Calendar, ChevronRight, BarChart3, Truck, DollarSign, Users } from "lucide-react";
import { base44 } from "@/api/base44Client";

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

const reportTypes = [
  { title: "Fleet Utilisation Report", desc: "Vehicle usage, downtime, fuel consumption", icon: Truck },
  { title: "Revenue & Margin Report", desc: "Revenue breakdown, margins, client billing", icon: DollarSign },
  { title: "Operations Summary", desc: "Jobs completed, on-time rate, efficiency", icon: BarChart3 },
  { title: "Client Activity Report", desc: "Service frequency, volume, billing history", icon: Users },
  { title: "Safety & Compliance", desc: "Pre-start completion, incidents, inspections", icon: FileText },
  { title: "Supplier Spend Analysis", desc: "Fuel, parts, tyres, leasing breakdown", icon: DollarSign },
];

export default function Reports() {
  const [stats, setStats] = useState({ vehicles: 0, jobs: 0, invoices: 0, clients: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const [vehicles, jobs, invoices, clients] = await Promise.all([
          base44.entities.Vehicle.list(),
          base44.entities.Job.list(),
          base44.entities.Invoice.list(),
          base44.entities.Client.list(),
        ]);
        setStats({ vehicles: vehicles.length, jobs: jobs.length, invoices: invoices.length, clients: clients.length });
      } catch {}
      finally { setLoading(false); }
    }
    loadStats();
  }, []);

  return (
    <div className="max-w-7xl mx-auto">
      <TopBar title="Reports" subtitle="Operational intelligence & analytics" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reportTypes.map((report, i) => (
          <motion.div key={report.title} {...fadeIn} transition={{ delay: i * 0.04 }}>
            <GlassCard level={2} hover className="p-5 cursor-pointer group h-full flex flex-col">
              <div className="flex items-start gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-robur-charcoal/5 shrink-0">
                  <report.icon className="h-5 w-5 text-robur-charcoal" strokeWidth={1.5} />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-robur-charcoal">{report.title}</h3>
                  <p className="text-[10px] text-robur-steel mt-0.5">{report.desc}</p>
                </div>
              </div>

              <div className="flex-1" />

              <div className="flex items-center justify-between pt-3 border-t border-robur-light/20">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-robur-steel/50">
                    {loading ? "Loading..." : `${stats.vehicles} vehicles · ${stats.jobs} jobs`}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Download className="h-3.5 w-3.5 text-robur-steel/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <ChevronRight className="h-4 w-4 text-robur-light opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>
    </div>
  );
}