import { useState, useEffect } from "react";
import TopBar from "@/components/layout/TopBar";
import GlassCard from "@/components/ui/GlassCard";
import MetricCard from "@/components/ui/MetricCard";
import { motion } from "framer-motion";
import { FileCheck, Download, Shield, Calendar } from "lucide-react";
import { generateComplianceReport } from "@/functions/generateComplianceReport";
import { cn } from "@/lib/utils";

const fadeIn = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

export default function Compliance() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const load = () => {
    setLoading(true);
    generateComplianceReport({ start_date: startDate || undefined, end_date: endDate || undefined })
      .then(res => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const records = data?.records || [];
  const summary = data?.summary || {};

  return (
    <div className="max-w-7xl mx-auto">
      <TopBar title="Compliance Reporting" subtitle="EPA chain-of-custody · auto-generated from validated dockets" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <motion.div {...fadeIn} transition={{ delay: 0 }}>
          <MetricCard label="Compliance Records" value={loading ? '—' : summary.total_records || 0} change="Validated dockets" changeType="up" icon={FileCheck} />
        </motion.div>
        <motion.div {...fadeIn} transition={{ delay: 0.05 }}>
          <MetricCard label="Total Waste Tracked" value={loading ? '—' : `${summary.total_weight || 0}t`} change="Tonnes moved" changeType="up" icon={Shield} />
        </motion.div>
        <motion.div {...fadeIn} transition={{ delay: 0.1 }}>
          <MetricCard label="Material Types" value={loading ? '—' : summary.materials?.length || 0} change="Classified" changeType="up" icon={FileCheck} />
        </motion.div>
        <motion.div {...fadeIn} transition={{ delay: 0.15 }}>
          <MetricCard label="Sites Covered" value={loading ? '—' : summary.sites?.length || 0} change="Origin points" changeType="up" icon={Calendar} />
        </motion.div>
      </div>

      <motion.div {...fadeIn} transition={{ delay: 0.2 }}>
        <GlassCard level={2} className="p-4 mb-5">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-robur-steel mb-1">Start Date</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="rounded-lg border border-robur-light/40 bg-white px-3 py-1.5 text-xs text-robur-charcoal" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-robur-steel mb-1">End Date</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="rounded-lg border border-robur-light/40 bg-white px-3 py-1.5 text-xs text-robur-charcoal" />
            </div>
            <button onClick={load} className="rounded-lg bg-robur-yellow px-4 py-1.5 text-xs font-bold text-robur-charcoal hover:bg-robur-yellow/90 transition-colors">
              Generate Report
            </button>
            <button
              onClick={() => {
                const csv = ['Docket No,Date,Waste Type,Weight (t),Origin,Vehicle,Driver,EPA Code']
                  .concat(records.map(r => `${r.docket_no},${r.date},${r.waste_type},${r.weight_tonnes},${r.origin},${r.vehicle},${r.driver},${r.epa_code}`))
                  .join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = `compliance-report-${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
              }}
              className="flex items-center gap-1.5 rounded-lg bg-robur-charcoal/5 px-3 py-1.5 text-xs font-medium text-robur-steel hover:bg-robur-charcoal/10 transition-colors"
            >
              <Download className="h-3 w-3" strokeWidth={2} /> Export CSV
            </button>
          </div>
        </GlassCard>
      </motion.div>

      <motion.div {...fadeIn} transition={{ delay: 0.25 }}>
        <GlassCard level={2} className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-4 w-4 text-robur-yellow" strokeWidth={2} />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-robur-steel">Chain of Custody Records</h3>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-12 rounded-xl bg-robur-charcoal/[0.03] animate-pulse" />)}
            </div>
          ) : records.length === 0 ? (
            <p className="text-xs text-robur-steel/60 py-8 text-center">No compliance records found. Validate dockets to generate chain-of-custody certificates.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-robur-light/30">
                    <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-robur-steel/60">EPA Code</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-robur-steel/60">Date</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-robur-steel/60">Waste Type</th>
                    <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-robur-steel/60">Weight</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-robur-steel/60">Origin</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-robur-steel/60">Vehicle</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-robur-steel/60">Driver</th>
                    <th className="px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-robur-steel/60">Custody</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r, i) => (
                    <tr key={i} className="border-b border-robur-light/15 hover:bg-robur-charcoal/[0.02] transition-colors">
                      <td className="px-3 py-2.5 text-xs font-bold text-robur-charcoal">{r.epa_code}</td>
                      <td className="px-3 py-2.5 text-xs text-robur-steel">{r.date}</td>
                      <td className="px-3 py-2.5 text-xs font-medium text-robur-charcoal">{r.waste_type || '—'}</td>
                      <td className="px-3 py-2.5 text-xs font-semibold text-robur-charcoal text-right">{r.weight_tonnes?.toFixed(1) || '0'} t</td>
                      <td className="px-3 py-2.5 text-xs text-robur-steel">{r.origin || '—'}</td>
                      <td className="px-3 py-2.5 text-xs text-robur-steel">{r.vehicle || '—'}</td>
                      <td className="px-3 py-2.5 text-xs text-robur-steel">{r.driver || '—'}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                          <Shield className="h-2.5 w-2.5" strokeWidth={2.5} /> {r.chain_of_custody}
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