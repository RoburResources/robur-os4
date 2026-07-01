import { useState, useEffect } from "react";
import TopBar from "@/components/layout/TopBar";
import GlassCard from "@/components/ui/GlassCard";
import MetricCard from "@/components/ui/MetricCard";
import StatusDot from "@/components/ui/StatusDot";
import { motion } from "framer-motion";
import { Package, FileText, CalendarDays, CheckCircle2, MapPin, Clock, ChevronRight } from "lucide-react";
import { base44 } from "@/api/base44Client";

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

const statusStyles = {
  paid: "bg-emerald-50 text-emerald-600",
  sent: "bg-amber-50 text-robur-yellow",
  overdue: "bg-red-50 text-red-500",
  draft: "bg-robur-charcoal/5 text-robur-steel",
};

export default function ClientPortal() {
  const [jobs, setJobs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const me = await base44.auth.me();
        const [allJobs, allInvoices] = await Promise.all([
          base44.entities.Job.list(),
          base44.entities.Invoice.list(),
        ]);
        // Filter to jobs/invoices created by the current user
        setJobs(allJobs.filter((j) => j.created_by_id === me?.id));
        setInvoices(allInvoices.filter((i) => i.created_by_id === me?.id));
      } catch {}
      finally { setLoading(false); }
    }
    loadData();
  }, []);

  const upcomingJobs = jobs.filter((j) => j.status !== "completed").slice(0, 5);
  const completedJobs = jobs.filter((j) => j.status === "completed").slice(0, 5);
  const ytdServices = jobs.length;
  const outstanding = invoices
    .filter((i) => i.status === "sent" || i.status === "overdue")
    .reduce((sum, i) => sum + (i.total || 0), 0);

  return (
    <div className="max-w-7xl mx-auto">
      <TopBar title="Client Portal" subtitle="Your account overview" />

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <motion.div {...fadeIn} transition={{ delay: 0 }}>
          <MetricCard label="Active Jobs" value={loading ? "—" : jobs.filter((j) => j.status !== "completed").length} icon={Package} />
        </motion.div>
        <motion.div {...fadeIn} transition={{ delay: 0.05 }}>
          <MetricCard label="Outstanding" value={loading ? "—" : `$${outstanding.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} icon={FileText} />
        </motion.div>
        <motion.div {...fadeIn} transition={{ delay: 0.1 }}>
          <MetricCard label="Services YTD" value={loading ? "—" : ytdServices} icon={CalendarDays} />
        </motion.div>
        <motion.div {...fadeIn} transition={{ delay: 0.15 }}>
          <MetricCard label="Completed" value={loading ? "—" : completedJobs.length} icon={CheckCircle2} />
        </motion.div>
      </div>

      <div className="grid grid-cols-12 gap-5">
        {/* Upcoming Jobs */}
        <motion.div className="col-span-12 lg:col-span-7" {...fadeIn} transition={{ delay: 0.2 }}>
          <GlassCard level={2} className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-robur-steel">Upcoming Services</h3>
              <span className="text-xs font-medium text-robur-yellow">{loading ? "—" : `${upcomingJobs.length} scheduled`}</span>
            </div>
            {loading ? (
              <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-robur-charcoal/[0.03] animate-pulse" />)}</div>
            ) : upcomingJobs.length === 0 ? (
              <p className="text-xs text-robur-steel/60 text-center py-8">No upcoming services scheduled</p>
            ) : (
              <div className="space-y-2">
                {upcomingJobs.map((job) => (
                  <div key={job.id} className="group flex items-center gap-4 rounded-xl border border-robur-light/30 p-3 hover:border-robur-yellow/30 transition-colors cursor-pointer">
                    <div className="flex flex-col items-center rounded-lg bg-robur-charcoal px-3 py-2 text-center">
                      <span className="text-[10px] font-medium text-robur-light/60">{job.scheduled_time ? new Date(job.scheduled_time).toLocaleDateString("en-AU", { weekday: "short" }) : "—"}</span>
                      <span className="text-lg font-bold text-white">{job.scheduled_time ? new Date(job.scheduled_time).getDate() : "—"}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-robur-charcoal">{job.title}</p>
                      <div className="flex items-center gap-3 mt-1">
                        {job.site_address && (
                          <span className="flex items-center gap-1 text-[10px] text-robur-steel/60">
                            <MapPin className="h-3 w-3" /> {job.site_address}
                          </span>
                        )}
                        {job.scheduled_time && (
                          <span className="flex items-center gap-1 text-[10px] text-robur-steel/60">
                            <Clock className="h-3 w-3" /> {new Date(job.scheduled_time).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-robur-light opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </motion.div>

        {/* Invoices */}
        <motion.div className="col-span-12 lg:col-span-5" {...fadeIn} transition={{ delay: 0.25 }}>
          <GlassCard level={2} className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-robur-steel">Invoices</h3>
            </div>
            {loading ? (
              <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-14 rounded-xl bg-robur-charcoal/[0.03] animate-pulse" />)}</div>
            ) : invoices.length === 0 ? (
              <p className="text-xs text-robur-steel/60 text-center py-8">No invoices</p>
            ) : (
              <div className="space-y-2">
                {invoices.slice(0, 5).map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between rounded-xl p-3 hover:bg-robur-charcoal/[0.03] transition-colors cursor-pointer">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-robur-charcoal">{inv.invoice_no}</span>
                        <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${statusStyles[inv.status] || statusStyles.draft}`}>
                          {inv.status}
                        </span>
                      </div>
                      <span className="text-[10px] text-robur-steel/50">{inv.issue_date || "—"}</span>
                    </div>
                    <span className="text-sm font-bold text-robur-charcoal">${(inv.total || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </motion.div>

        {/* Service History */}
        <motion.div className="col-span-12" {...fadeIn} transition={{ delay: 0.3 }}>
          <GlassCard level={2} className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-robur-steel">Service History</h3>
            </div>
            {loading ? (
              <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-12 rounded-xl bg-robur-charcoal/[0.03] animate-pulse" />)}</div>
            ) : completedJobs.length === 0 ? (
              <p className="text-xs text-robur-steel/60 text-center py-8">No completed services yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-robur-light/30">
                      <th className="pb-2 pr-4 text-left text-[10px] font-semibold uppercase tracking-wider text-robur-steel/60">Reference</th>
                      <th className="pb-2 pr-4 text-left text-[10px] font-semibold uppercase tracking-wider text-robur-steel/60">Service</th>
                      <th className="pb-2 pr-4 text-left text-[10px] font-semibold uppercase tracking-wider text-robur-steel/60">Client</th>
                      <th className="pb-2 pr-4 text-left text-[10px] font-semibold uppercase tracking-wider text-robur-steel/60">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completedJobs.map((job) => (
                      <tr key={job.id} className="border-b border-robur-light/15 hover:bg-robur-charcoal/[0.02] transition-colors cursor-pointer">
                        <td className="py-3 pr-4 text-xs font-medium text-robur-charcoal">{job.job_id}</td>
                        <td className="py-3 pr-4 text-xs text-robur-charcoal">{job.title}</td>
                        <td className="py-3 pr-4 text-xs text-robur-steel">{job.client}</td>
                        <td className="py-3 pr-4">
                          <StatusDot status="active" label="Complete" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
}