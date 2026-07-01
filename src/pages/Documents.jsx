import { useState, useEffect } from "react";
import TopBar from "@/components/layout/TopBar";
import GlassCard from "@/components/ui/GlassCard";
import CameraDocketCapture from "@/components/ui/CameraDocketCapture";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  FileCheck,
  Package,
  Send,
  Check,
  ChevronRight,
  Mail,
  Lock,
  History,
  Archive,
  Sparkles,
  Camera,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { base44 } from "@/api/base44Client";

const fadeIn = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

const generatedDocs = [
  { name: "DMT Driver Movement Ticket", code: "DMT", color: "bg-blue-50 text-blue-600" },
  { name: "MGT Movement Goods Ticket", code: "MGT", color: "bg-purple-50 text-purple-600" },
  { name: "Data Summary Sheet", code: "DSS", color: "bg-emerald-50 text-emerald-600" },
];

const summaryPackTypes = ["DMT", "MGT", "DSS", "Exception Report"];
const deliveryChannels = [
  { label: "Email", icon: Mail },
  { label: "Secure Storage", icon: Lock },
  { label: "Audit Trail", icon: History },
  { label: "Retention", icon: Archive },
];

export default function Documents() {
  const [generated, setGenerated] = useState([false, false, false]);
  const [packSent, setPackSent] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [prefillData, setPrefillData] = useState(null);
  const [dockets, setDockets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPrefill() {
      try {
        const user = await base44.auth.me();
        const jobs = await base44.entities.Job.filter({ status: "en_route" });
        const myJob = jobs.find((j) =>
          j.vehicle_id?.toLowerCase().includes((user?.full_name || "").split(" ")[0]?.toLowerCase())
        ) || jobs[0];
        if (myJob) {
          setPrefillData({
            job_id: myJob.job_id,
            vehicle: myJob.vehicle_id,
            site: myJob.site_address || myJob.client,
            driver: user?.full_name,
          });
        }
      } catch {}
    }
    loadPrefill();
  }, []);

  useEffect(() => {
    base44.entities.Docket.list('-created_date', 10)
      .then(setDockets)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto">
      <TopBar title="Document Workflow" subtitle="Source → Extract → Generate → Pack → Archive" />

      {/* Camera-first docket capture */}
      <AnimatePresence>
        {showCamera && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-robur-steel">Capture Docket</h3>
              <button
                onClick={() => setShowCamera(false)}
                className="text-[10px] font-medium text-robur-steel hover:text-robur-charcoal"
              >
                Close
              </button>
            </div>
            <CameraDocketCapture
              onCaptured={() => setShowCamera(false)}
              onClose={() => setShowCamera(false)}
              prefillData={prefillData}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick capture button */}
      {!showCamera && (
        <motion.button
          {...fadeIn}
          onClick={() => setShowCamera(true)}
          className="mb-6 flex w-full items-center justify-center gap-2 rounded-xl bg-robur-yellow py-3 text-sm font-bold text-robur-charcoal hover:bg-robur-yellow/90 transition-colors"
        >
          <Camera className="h-4 w-4" strokeWidth={2} />
          Capture Docket with Camera
        </motion.button>
      )}

      {/* Recent Dockets */}
      <motion.div {...fadeIn} transition={{ delay: 0.25 }} className="mb-6">
        <GlassCard level={2} className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-4 w-4 text-robur-yellow" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-robur-steel">Recent Dockets</h3>
          </div>
          {loading ? (
            <div className="space-y-2">{[1, 2, 3, 4].map((i) => <div key={i} className="h-12 rounded-xl bg-robur-charcoal/[0.03] animate-pulse" />)}</div>
          ) : dockets.length === 0 ? (
            <p className="text-xs text-robur-steel/60 text-center py-8">No dockets yet. Capture a docket to start the workflow.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-robur-light/30">
                    <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-robur-steel/60">Docket No</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-robur-steel/60">Date</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-robur-steel/60">Vehicle</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-robur-steel/60">Material</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-robur-steel/60">Net</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-robur-steel/60">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dockets.map((d) => (
                    <tr key={d.id} className="border-b border-robur-light/15 hover:bg-robur-charcoal/[0.02] transition-colors">
                      <td className="px-3 py-2.5 text-xs font-bold text-robur-charcoal">{d.docket_no}</td>
                      <td className="px-3 py-2.5 text-xs text-robur-steel">{d.date || "—"}</td>
                      <td className="px-3 py-2.5 text-xs text-robur-steel">{d.vehicle || "—"}</td>
                      <td className="px-3 py-2.5 text-xs text-robur-steel">{d.material || "—"}</td>
                      <td className="px-3 py-2.5 text-xs font-semibold text-robur-charcoal">{d.net_weight ? `${d.net_weight} t` : "—"}</td>
                      <td className="px-3 py-2.5">
                        <span className="inline-flex items-center gap-1 rounded-md bg-robur-charcoal/5 px-2 py-0.5 text-[10px] font-semibold text-robur-steel">
                          {d.status}
                        </span>
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
  );
}