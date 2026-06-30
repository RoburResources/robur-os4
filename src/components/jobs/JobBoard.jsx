import { Search, Plus, Check } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import StatusDot from "@/components/ui/StatusDot";
import { cn } from "@/lib/utils";

const statusLabels = {
  created: "Created",
  scheduled: "Scheduled",
  assigned: "Assigned",
  dispatched: "Dispatched",
  en_route: "En Route",
  completed: "Completed",
};

const statusVariants = {
  created: "idle",
  scheduled: "idle",
  assigned: "warning",
  dispatched: "active",
  en_route: "active",
  completed: "active",
};

export default function JobBoard({ jobs, selectedJob, onSelect, search, onSearch, onNewJob, loading, selectedIds = [], onToggleSelect, onToggleSelectAll }) {
  const allSelected = jobs.length > 0 && selectedIds.length === jobs.length;

  return (
    <GlassCard level={2} className="p-4 flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-robur-steel">Job Board</h3>
        <button onClick={onNewJob} className="flex items-center gap-1 text-[10px] font-semibold text-robur-yellow hover:underline">
          <Plus className="h-3 w-3" strokeWidth={2} /> New
        </button>
      </div>

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-robur-steel/50" />
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search jobs..."
          className="w-full rounded-lg border border-robur-light/30 bg-white/60 pl-9 pr-3 py-2 text-xs text-robur-charcoal placeholder:text-robur-steel/40 focus:outline-none focus:ring-2 focus:ring-robur-yellow/30"
        />
      </div>

      {jobs.length > 0 && onToggleSelectAll && (
        <button
          onClick={onToggleSelectAll}
          className="flex items-center gap-2 mb-2 px-1 text-[10px] font-medium text-robur-steel hover:text-robur-charcoal transition-colors"
        >
          <div className={cn(
            "flex h-4 w-4 items-center justify-center rounded border transition-all",
            allSelected ? "bg-robur-yellow border-robur-yellow" : "border-robur-light/40 bg-white/40"
          )}>
            {allSelected && <Check className="h-3 w-3 text-robur-charcoal" strokeWidth={3} />}
          </div>
          {allSelected ? "Deselect all" : "Select all"}
        </button>
      )}

      <div className="flex-1 overflow-y-auto space-y-1.5 -mr-1 pr-1">
        {loading ? (
          <p className="text-xs text-robur-steel text-center py-8">Loading jobs...</p>
        ) : jobs.length === 0 ? (
          <p className="text-xs text-robur-steel text-center py-8">No jobs found</p>
        ) : (
          jobs.map((job) => {
            const isSelected = selectedIds.includes(job.id);
            const isDetailSelected = selectedJob?.id === job.id;
            return (
              <div
                key={job.id}
                className={cn(
                  "relative text-left rounded-xl p-3 transition-all border",
                  isDetailSelected
                    ? "bg-robur-yellow/10 border-robur-yellow/40"
                    : "bg-white/40 border-transparent hover:bg-robur-charcoal/[0.03] hover:border-robur-light/20"
                )}
              >
                <div className="flex items-center gap-2">
                  {onToggleSelect && (
                    <button
                      onClick={() => onToggleSelect(job.id)}
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all",
                        isSelected ? "bg-robur-yellow border-robur-yellow" : "border-robur-light/40 bg-white/40 hover:border-robur-steel/40"
                      )}
                    >
                      {isSelected && <Check className="h-3 w-3 text-robur-charcoal" strokeWidth={3} />}
                    </button>
                  )}
                  <button
                    onClick={() => onSelect(job)}
                    className="flex-1 text-left"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-robur-charcoal">{job.job_id}</span>
                      <StatusDot status={statusVariants[job.status] || "idle"} size="xs" label={statusLabels[job.status]} />
                    </div>
                    <p className="text-[11px] font-semibold text-robur-charcoal truncate">{job.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-robur-steel">{job.client}</span>
                      <span className="text-[10px] text-robur-light">·</span>
                      <span className="text-[10px] text-robur-steel">{job.job_type}</span>
                    </div>
                    <p className="text-[10px] text-robur-steel/60 mt-0.5">{job.scheduled_time}</p>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </GlassCard>
  );
}