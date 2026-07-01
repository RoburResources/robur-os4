import { useState, useEffect } from "react";
import GlassCard from "@/components/ui/GlassCard";
import StatusDot from "@/components/ui/StatusDot";
import { Package, Clock, MapPin, ChevronRight } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function ActiveJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Job.list("-updated_date", 10)
      .then((data) => {
        setJobs(data.filter((j) => j.status !== "completed"));
      })
      .catch(() => setJobs([]))
      .finally(() => setLoading(false));
  }, []);

  const statusFor = (j) => {
    if (j.status === "dispatched" || j.status === "en_route") return "active";
    if (j.status === "assigned") return "idle";
    return "idle";
  };

  return (
    <GlassCard level={2} className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-robur-steel">Active Jobs</h3>
        {!loading && jobs.length > 0 && (
          <span className="text-xs font-medium text-robur-yellow">{jobs.length} in progress</span>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-robur-charcoal/[0.03] animate-pulse" />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <p className="text-xs text-robur-steel/60 text-center py-8">No active jobs</p>
      ) : (
        <div className="space-y-2">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="group rounded-xl border border-robur-light/30 p-3 hover:border-robur-yellow/30 hover:bg-robur-charcoal/[0.02] transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Package className="h-3.5 w-3.5 text-robur-steel" strokeWidth={1.5} />
                  <span className="text-xs font-bold text-robur-charcoal">{job.job_id}</span>
                  <StatusDot status={statusFor(job)} size="xs" />
                </div>
                {job.job_type && (
                  <span className="rounded-md bg-robur-charcoal/5 px-2 py-0.5 text-[10px] font-medium text-robur-steel">
                    {job.job_type}
                  </span>
                )}
              </div>
              <p className="text-sm font-medium text-robur-charcoal">{job.title}</p>
              <div className="flex items-center gap-4 mt-1.5">
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
              {job.vehicle_id && (
                <div className="mt-2 pt-2 border-t border-robur-light/20 flex items-center justify-between">
                  <span className="text-[10px] font-medium text-robur-steel/50">Vehicle: {job.vehicle_id}</span>
                  <ChevronRight className="h-3 w-3 text-robur-light opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}