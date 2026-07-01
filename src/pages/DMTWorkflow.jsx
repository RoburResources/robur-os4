import { useState, useEffect } from "react";
import TopBar from "@/components/layout/TopBar";
import GlassCard from "@/components/ui/GlassCard";
import WorkflowFlow from "@/components/ui/WorkflowFlow";
import { motion } from "framer-motion";
import { Truck, MapPin, Clock, User, Navigation, ArrowRight, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { base44 } from "@/api/base44Client";

const fadeIn = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

const flowSteps = ["Job Received", "Pre-Start", "En Route", "On Site", "Complete", "End"];

export default function DMTWorkflow() {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    base44.entities.Job.list('-updated_date', 20)
      .then((data) => {
        setMovements(data);
        if (data.length > 0) setSelected(data[0]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const stageFor = (status) => {
    const map = { created: 0, scheduled: 1, assigned: 1, dispatched: 2, en_route: 3, completed: 4 };
    return map[status] ?? 0;
  };

  const advance = async () => {
    if (!selected) return;
    const currentStage = stageFor(selected.status);
    if (currentStage >= flowSteps.length - 1) return;
    const nextStatus = ["created", "scheduled", "dispatched", "en_route", "completed", "completed"][currentStage + 1];
    try {
      const updated = await base44.entities.Job.update(selected.id, { status: nextStatus });
      setSelected(updated);
      setMovements((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    } catch (err) { console.error(err); }
  };

  const stage = selected ? stageFor(selected.status) : 0;

  return (
    <div className="max-w-7xl mx-auto">
      <TopBar title="DMT Workflow" subtitle="Driver Management · Movement Ticket Sequence" />
      <WorkflowFlow steps={flowSteps} currentStep={stage} />

      <div className="grid grid-cols-12 gap-4" style={{ minHeight: "calc(100vh - 340px)" }}>
        {/* Movement List */}
        <motion.div className="col-span-12 lg:col-span-4" {...fadeIn}>
          <GlassCard level={2} className="p-4 h-full">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-robur-steel">Active Movements</h3>
              <span className="text-[10px] text-robur-steel/50">{loading ? "..." : `${movements.length} total`}</span>
            </div>
            {loading ? (
              <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-robur-charcoal/[0.03] animate-pulse" />)}</div>
            ) : movements.length === 0 ? (
              <p className="text-xs text-robur-steel/60 text-center py-8">No active movements</p>
            ) : (
              <div className="space-y-1.5 overflow-y-auto" style={{ maxHeight: "calc(100vh - 420px)" }}>
                {movements.map((m) => {
                  const s = stageFor(m.status);
                  return (
                    <button
                      key={m.id}
                      onClick={() => setSelected(m)}
                      className={cn(
                        "w-full text-left rounded-xl p-3 transition-all border",
                        selected?.id === m.id
                          ? "bg-robur-yellow/10 border-robur-yellow/40"
                          : "bg-white/40 border-transparent hover:bg-robur-charcoal/[0.03] hover:border-robur-light/20"
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-robur-charcoal">{m.job_id}</span>
                        <span className={cn(
                          "rounded-md px-1.5 py-0.5 text-[9px] font-semibold",
                          s < 2 ? "bg-robur-charcoal/5 text-robur-steel"
                          : s < 4 ? "bg-robur-yellow/20 text-robur-charcoal"
                          : "bg-emerald-50 text-emerald-600"
                        )}>
                          {flowSteps[s]}
                        </span>
                      </div>
                      <p className="text-[11px] font-medium text-robur-charcoal truncate">{m.title}</p>
                      <p className="text-[10px] text-robur-steel truncate">{m.client} · {m.vehicle_id || "Unassigned"}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </GlassCard>
        </motion.div>

        {/* Detail */}
        <motion.div className="col-span-12 lg:col-span-8" {...fadeIn} transition={{ delay: 0.05 }}>
          <GlassCard level={2} className="p-5 h-full">
            {!selected ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-xs text-robur-steel/60">Select a movement to view details</p>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-robur-charcoal">{selected.job_id}</span>
                      <span className="rounded-md bg-robur-yellow/20 px-2 py-0.5 text-[10px] font-semibold text-robur-charcoal">
                        Stage {stage + 1} / {flowSteps.length}
                      </span>
                    </div>
                    <p className="text-xs text-robur-steel">{selected.title} · {selected.client}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Navigation className="h-4 w-4 text-robur-yellow" strokeWidth={2} />
                    <span className="text-xs font-semibold text-robur-charcoal">{selected.status}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-5">
                  <DetailField icon={Truck} label="Vehicle" value={selected.vehicle_id || "—"} />
                  <DetailField icon={User} label="Contact" value={selected.contact_name || "—"} />
                  <DetailField icon={MapPin} label="Site" value={selected.site_address || "—"} />
                  <DetailField icon={Clock} label="Scheduled" value={selected.scheduled_time ? new Date(selected.scheduled_time).toLocaleString("en-AU") : "—"} />
                </div>

                {/* Stage Progress */}
                <div className="rounded-xl bg-robur-charcoal/[0.03] p-4 mb-5">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-robur-steel mb-3">Stage Progress</p>
                  <div className="flex items-center gap-1.5">
                    {flowSteps.map((step, i) => (
                      <div key={step} className="flex items-center gap-1.5 flex-1">
                        <div className={cn(
                          "h-1.5 flex-1 rounded-full transition-all",
                          i <= stage ? "bg-robur-yellow" : "bg-robur-light/30"
                        )} />
                        {i === stage && (
                          <span className="text-[9px] font-bold text-robur-charcoal whitespace-nowrap">{step}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {stage < flowSteps.length - 1 ? (
                  <button
                    onClick={advance}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-robur-charcoal py-3 text-xs font-semibold text-white hover:bg-robur-charcoal/90 transition-colors"
                  >
                    Advance to {flowSteps[stage + 1]}
                    <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                ) : (
                  <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 py-3 text-xs font-semibold text-emerald-600">
                    <CheckCircle className="h-4 w-4" /> Workflow Complete
                  </div>
                )}
              </>
            )}
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
}

function DetailField({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl bg-robur-charcoal/[0.03] p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="h-3 w-3 text-robur-steel/50" strokeWidth={1.5} />
        <span className="text-[10px] font-medium uppercase tracking-wide text-robur-steel">{label}</span>
      </div>
      <p className="text-xs font-semibold text-robur-charcoal leading-snug">{value}</p>
    </div>
  );
}