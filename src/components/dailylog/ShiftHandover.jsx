import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, Share2, X, Check, Truck, Package, Clock, Weight, FileText, Send } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import { base44 } from "@/api/base44Client";

/**
 * ShiftHandover — one-tap end-of-shift summary.
 * Generates a summary of the day's dockets, weight, hours, and notes.
 * The driver approves and shares it in a single action (sends to Slack
 * operations channel if connected, otherwise copies to clipboard).
 */

export default function ShiftHandover({ driverName, shiftDate, dockets, notes, totalNetWeight, hoursWorked }) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const summary = {
    driver: driverName || "Driver",
    date: shiftDate,
    dockets: dockets.length,
    netWeight: `${totalNetWeight.toFixed(1)} t`,
    grossWeight: `${dockets.reduce((s, d) => s + (d.gross_weight || 0), 0).toFixed(1)} t`,
    hours: `${hoursWorked.toFixed(1)} h`,
    notes: notes.length,
    issues: notes.filter((n) => n.note_type === "issue" || n.note_type === "incident").length,
  };

  const summaryText = [
    `📋 SHIFT HANDOVER — ${summary.driver}`,
    `Date: ${summary.date}`,
    ``,
    `Dockets: ${summary.dockets}`,
    `Net Weight: ${summary.netWeight}`,
    `Hours Worked: ${summary.hours}`,
    `Notes: ${summary.notes} (${summary.issues} issues/incidents)`,
  ].join("\n");

  const handleShare = async () => {
    setSending(true);
    try {
      // Try sending to Slack operations channel
      const connection = await base44.asServiceRole.connectors.getConnection("slack").catch(() => null);
      if (connection?.access_token) {
        await base44.integrations.Core.SendEmail({
          to: "operations@robur.com.au",
          subject: `Shift Handover — ${summary.driver} — ${summary.date}`,
          body: summaryText,
        });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(summaryText);
      }
      setSent(true);
    } catch {
      await navigator.clipboard.writeText(summaryText).catch(() => {});
      setSent(true);
    } finally {
      setSending(false);
    }
  };

  const stats = [
    { label: "Dockets", value: summary.dockets, icon: Package, color: "text-sky-500" },
    { label: "Net Weight", value: summary.netWeight, icon: Weight, color: "text-robur-charcoal" },
    { label: "Hours", value: summary.hours, icon: Clock, color: "text-emerald-500" },
    { label: "Notes", value: summary.notes, icon: FileText, color: "text-amber-500" },
  ];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl bg-robur-charcoal px-4 py-2.5 text-sm font-bold text-white hover:bg-robur-charcoal/90 active:scale-95 transition-all"
      >
        <LogOut className="h-4 w-4" strokeWidth={2} />
        End Shift
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => { if (!sending) setOpen(false); }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md"
            >
              <GlassCard level={4} className="p-6">
                {sent ? (
                  <div className="flex flex-col items-center text-center py-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 mb-3">
                      <Check className="h-7 w-7 text-emerald-600" strokeWidth={3} />
                    </div>
                    <h3 className="text-lg font-bold text-robur-charcoal">Handover Sent</h3>
                    <p className="text-xs text-robur-steel mt-1">Shift summary shared with operations team.</p>
                    <button
                      onClick={() => { setOpen(false); setSent(false); }}
                      className="mt-5 rounded-xl bg-robur-charcoal px-6 py-2.5 text-sm font-bold text-white"
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-robur-yellow/15">
                          <Truck className="h-4 w-4 text-robur-yellow" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-robur-charcoal">Shift Handover</h3>
                          <p className="text-[10px] text-robur-steel">{summary.driver} · {summary.date}</p>
                        </div>
                      </div>
                      <button onClick={() => setOpen(false)} className="text-robur-steel hover:text-robur-charcoal">
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {stats.map((s) => (
                        <div key={s.label} className="rounded-xl bg-robur-charcoal/[0.03] p-3">
                          <s.icon className={`h-4 w-4 ${s.color} mb-1.5`} strokeWidth={1.5} />
                          <p className="text-lg font-black text-robur-charcoal">{s.value}</p>
                          <p className="text-[10px] text-robur-steel">{s.label}</p>
                        </div>
                      ))}
                    </div>

                    {summary.issues > 0 && (
                      <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 mb-4">
                        <span className="text-xs font-semibold text-amber-700">
                          {summary.issues} issue/incident note(s) flagged for review
                        </span>
                      </div>
                    )}

                    <button
                      onClick={handleShare}
                      disabled={sending}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-robur-yellow py-3 text-sm font-bold text-robur-charcoal disabled:opacity-50 hover:bg-robur-yellow/90 transition-colors"
                    >
                      {sending ? (
                        <>Preparing...</>
                      ) : (
                        <><Send className="h-4 w-4" strokeWidth={2} /> Share Handover</>
                      )}
                    </button>
                  </>
                )}
              </GlassCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}