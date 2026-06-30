import { useState, useEffect } from "react";
import GlassCard from "@/components/ui/GlassCard";
import { motion } from "framer-motion";
import { Clock, TrendingUp, Truck, DollarSign, ArrowRight, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";

/**
 * WhatNextPanel — Predictive UI for the executive dashboard.
 * Instead of showing historical metrics, this panel focuses on the
 * "30-minute lookahead": what's about to happen in the next 2 hours.
 * Helps users prepare for upcoming events rather than review the past.
 */

const fadeIn = { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 } };

export default function WhatNextPanel() {
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUpcoming() {
      try {
        const jobs = await base44.entities.Job.list();
        const now = new Date();
        const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);

        const upcomingJobs = jobs
          .filter((j) => {
            if (!j.scheduled_time) return false;
            const d = new Date(j.scheduled_time);
            return d >= now && d <= twoHoursLater;
          })
          .sort((a, b) => new Date(a.scheduled_time) - new Date(b.scheduled_time))
          .slice(0, 5);

        setUpcoming(upcomingJobs);
      } catch {
        setUpcoming([]);
      } finally {
        setLoading(false);
      }
    }
    loadUpcoming();
  }, []);

  const now = new Date();
  const inTwoHours = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const timeRange = `${now.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })} – ${inTwoHours.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })}`;

  return (
    <motion.div {...fadeIn} transition={{ delay: 0.05 }}>
      <GlassCard level={2} className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-robur-yellow/15">
              <Clock className="h-3.5 w-3.5 text-robur-yellow" strokeWidth={2} />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-robur-charcoal">What's Next</h3>
              <p className="text-[9px] text-robur-steel">Next 2 hours · {timeRange}</p>
            </div>
          </div>
          <span className="rounded-md bg-robur-yellow/10 px-2 py-0.5 text-[10px] font-bold text-robur-charcoal">
            {loading ? "—" : upcoming.length} upcoming
          </span>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 rounded-xl bg-robur-charcoal/[0.03] animate-pulse" />
            ))}
          </div>
        ) : upcoming.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6">
            <CheckCircle className="h-8 w-8 text-emerald-400 mb-2" strokeWidth={1.5} />
            <p className="text-xs font-medium text-robur-steel">Nothing scheduled in the next 2 hours</p>
          </div>
        ) : (
          <div className="space-y-2">
            {upcoming.map((job, i) => {
              const minutesUntil = Math.round((new Date(job.scheduled_time) - now) / 60000);
              return (
                <motion.div
                  key={job.id}
                  {...fadeIn}
                  transition={{ delay: 0.1 + i * 0.05 }}
                >
                  <Link
                    to="/jobs"
                    className="group flex items-center gap-3 rounded-xl bg-robur-charcoal/[0.03] p-3 hover:bg-robur-yellow/5 transition-colors"
                  >
                    {/* Time badge */}
                    <div className="flex flex-col items-center shrink-0">
                      <span className="text-[10px] font-bold text-robur-charcoal">
                        {new Date(job.scheduled_time).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <span className="text-[8px] text-robur-steel">
                        {minutesUntil <= 0 ? "now" : `in ${minutesUntil}m`}
                      </span>
                    </div>

                    <div className="w-px h-8 bg-robur-light/20" />

                    {/* Job info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-robur-charcoal truncate">{job.title}</p>
                      <p className="text-[10px] text-robur-steel truncate">
                        {job.job_id} · {job.client}
                      </p>
                    </div>

                    {/* Status icon */}
                    <div className="flex items-center gap-1 shrink-0">
                      {job.vehicle_id ? (
                        <Truck className="h-3 w-3 text-emerald-500" strokeWidth={2} />
                      ) : (
                        <Truck className="h-3 w-3 text-robur-steel/40" strokeWidth={2} />
                      )}
                    </div>

                    <ArrowRight className="h-3 w-3 text-robur-steel/30 group-hover:text-robur-yellow transition-colors" />
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </GlassCard>
    </motion.div>
  );
}