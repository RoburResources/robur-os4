import { useState, useEffect } from "react";
import TopBar from "@/components/layout/TopBar";
import GlassCard from "@/components/ui/GlassCard";
import WorkflowFlow from "@/components/ui/WorkflowFlow";
import { motion } from "framer-motion";
import { FileText, Clock, User, Check, X, ArrowRight, FileCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { base44 } from "@/api/base44Client";

const fadeIn = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

const flowSteps = ["Submit", "Review", "Approve", "Archive"];

export default function MGTWorkflow() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    base44.entities.Invoice.list('-created_date', 20)
      .then((data) => {
        setInvoices(data);
        if (data.length > 0) setSelected(data[0]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const stageFor = (status) => {
    const map = { draft: 0, sent: 1, paid: 2, overdue: 1 };
    return map[status] ?? 0;
  };

  const advance = async () => {
    if (!selected) return;
    const currentStage = stageFor(selected.status);
    if (currentStage >= flowSteps.length - 1) return;
    const nextStatus = currentStage === 1 ? "paid" : currentStage === 2 ? "paid" : "sent";
    try {
      const updated = await base44.entities.Invoice.update(selected.id, { status: nextStatus });
      setSelected(updated);
      setInvoices((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    } catch (err) { console.error(err); }
  };

  const stage = selected ? stageFor(selected.status) : 0;

  return (
    <div className="max-w-7xl mx-auto">
      <TopBar title="MGT Workflow" subtitle="Management Approvals · Movement Goods Tickets" />
      <WorkflowFlow steps={flowSteps} currentStep={stage} />

      <div className="grid grid-cols-12 gap-4" style={{ minHeight: "calc(100vh - 340px)" }}>
        {/* Pending Approvals List */}
        <motion.div className="col-span-12 lg:col-span-4" {...fadeIn}>
          <GlassCard level={2} className="p-4 h-full">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-robur-steel">Approval Queue</h3>
              <span className="text-[10px] text-robur-steel/50">{loading ? "..." : `${invoices.filter((i) => i.status !== "paid").length} pending`}</span>
            </div>
            {loading ? (
              <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-robur-charcoal/[0.03] animate-pulse" />)}</div>
            ) : invoices.length === 0 ? (
              <p className="text-xs text-robur-steel/60 text-center py-8">No invoices pending approval</p>
            ) : (
              <div className="space-y-1.5 overflow-y-auto" style={{ maxHeight: "calc(100vh - 420px)" }}>
                {invoices.map((inv) => {
                  const s = stageFor(inv.status);
                  return (
                    <button
                      key={inv.id}
                      onClick={() => setSelected(inv)}
                      className={cn(
                        "w-full text-left rounded-xl p-3 transition-all border",
                        selected?.id === inv.id
                          ? "bg-robur-yellow/10 border-robur-yellow/40"
                          : "bg-white/40 border-transparent hover:bg-robur-charcoal/[0.03] hover:border-robur-light/20"
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-robur-charcoal">{inv.invoice_no}</span>
                        <span className={cn(
                          "rounded-md px-1.5 py-0.5 text-[9px] font-semibold",
                          s < 2 ? "bg-amber-50 text-amber-600"
                          : s === 2 ? "bg-blue-50 text-blue-600"
                          : "bg-emerald-50 text-emerald-600"
                        )}>
                          {flowSteps[s]}
                        </span>
                      </div>
                      <p className="text-[11px] font-medium text-robur-charcoal truncate">{inv.client}</p>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-[10px] text-robur-steel">{inv.status}</span>
                        <span className="text-[10px] font-semibold text-robur-charcoal">${(inv.total || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                      </div>
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
                <p className="text-xs text-robur-steel/60">Select an invoice to view details</p>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-robur-charcoal">{selected.invoice_no}</span>
                      <span className="rounded-md bg-robur-yellow/20 px-2 py-0.5 text-[10px] font-semibold text-robur-charcoal">
                        Stage {stage + 1} / {flowSteps.length}
                      </span>
                    </div>
                    <p className="text-xs text-robur-steel">{selected.client} · {selected.status}</p>
                  </div>
                  <span className="text-lg font-black text-robur-charcoal">${(selected.total || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-5">
                  <DetailField icon={User} label="Client" value={selected.client} />
                  <DetailField icon={Clock} label="Stage" value={flowSteps[stage]} />
                  <DetailField icon={FileText} label="Issue Date" value={selected.issue_date || "—"} />
                </div>

                {/* Invoice Details */}
                <div className="rounded-xl bg-robur-charcoal/[0.03] p-4 mb-5">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-robur-steel mb-3">Invoice Details</p>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-robur-steel">Dockets</span>
                      <span className="font-semibold text-robur-charcoal">{selected.docket_nos || "—"}</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-robur-steel">Subtotal</span>
                      <span className="font-semibold text-robur-charcoal">${(selected.subtotal || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-robur-steel">GST</span>
                      <span className="font-semibold text-robur-charcoal">${(selected.gst || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>
                    <div className="flex justify-between text-[10px] border-t border-robur-light/20 pt-1.5">
                      <span className="text-robur-steel">Total</span>
                      <span className="font-bold text-robur-charcoal">${(selected.total || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>
                  </div>
                </div>

                {stage < flowSteps.length - 1 ? (
                  <div className="flex gap-3">
                    <button
                      onClick={advance}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-robur-charcoal py-3 text-xs font-semibold text-white hover:bg-robur-charcoal/90 transition-colors"
                    >
                      <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                      Approve & Advance
                    </button>
                    <button className="flex items-center justify-center gap-2 rounded-xl bg-red-50 px-5 py-3 text-xs font-semibold text-red-500 hover:bg-red-100 transition-colors">
                      <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                      Reject
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 py-3 text-xs font-semibold text-emerald-600">
                    <FileCheck className="h-4 w-4" /> Archived · Workflow Complete
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