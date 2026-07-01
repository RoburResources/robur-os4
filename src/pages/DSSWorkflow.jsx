import { useState, useEffect, useMemo } from "react";
import TopBar from "@/components/layout/TopBar";
import GlassCard from "@/components/ui/GlassCard";
import WorkflowFlow from "@/components/ui/WorkflowFlow";
import { motion } from "framer-motion";
import { BarChart3, Database, FileText, Send, TrendingUp, CheckCircle, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { base44 } from "@/api/base44Client";

const fadeIn = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

const flowSteps = ["Aggregate", "Analyse", "Report", "Distribute"];

export default function DSSWorkflow() {
  const [distributed, setDistributed] = useState(false);
  const [dockets, setDockets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Docket.filter({ status: 'validated' })
      .then(setDockets)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const kpis = useMemo(() => {
    const totalMovements = dockets.length;
    const totalTonnage = dockets.reduce((s, d) => s + (d.net_weight || 0), 0);
    const materials = [...new Set(dockets.map((d) => d.material).filter(Boolean))];
    const sites = [...new Set(dockets.map((d) => d.site).filter(Boolean))];
    return [
      { label: "Total Movements", value: totalMovements.toString(), change: "Validated dockets" },
      { label: "Total Tonnage", value: `${totalTonnage.toFixed(0)} t`, change: "Net weight" },
      { label: "Material Types", value: materials.length.toString(), change: "Classified" },
      { label: "Sites Covered", value: sites.length.toString(), change: "Origin points" },
    ];
  }, [dockets]);

  const insights = useMemo(() => {
    if (dockets.length === 0) return [];
    const materialCounts = {};
    dockets.forEach((d) => {
      if (d.material) materialCounts[d.material] = (materialCounts[d.material] || 0) + 1;
    });
    const topMaterial = Object.entries(materialCounts).sort((a, b) => b[1] - a[1])[0];
    const siteCounts = {};
    dockets.forEach((d) => {
      if (d.site) siteCounts[d.site] = (siteCounts[d.site] || 0) + 1;
    });
    const topSite = Object.entries(siteCounts).sort((a, b) => b[1] - a[1])[0];

    const result = [];
    if (topMaterial) result.push({ metric: "Top Material", value: topMaterial[0], detail: `${topMaterial[1]} dockets`, trend: "up" });
    if (topSite) result.push({ metric: "Top Site", value: topSite[0], detail: `${topSite[1]} dockets`, trend: "up" });
    return result;
  }, [dockets]);

  const tonnageData = useMemo(() => {
    const days = {};
    dockets.forEach((d) => {
      if (d.date) {
        const day = new Date(d.date).toLocaleDateString("en-AU", { weekday: "short" });
        days[day] = (days[day] || 0) + (d.net_weight || 0);
      }
    });
    const ordered = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    return ordered.map((day) => ({ day, value: Math.round(days[day] || 0) }));
  }, [dockets]);

  const maxTonnage = Math.max(...tonnageData.map((d) => d.value), 1);

  return (
    <div className="max-w-7xl mx-auto">
      <TopBar title="DSS Workflow" subtitle="Decision Support · Aggregate → Analyse → Report → Distribute" />
      <WorkflowFlow steps={flowSteps} currentStep={distributed ? 3 : 2} />

      {/* KPI Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpis.map((k, i) => (
          <motion.div key={k.label} {...fadeIn} transition={{ delay: i * 0.05 }}>
            <GlassCard level={2} className="p-4">
              <p className="text-[10px] font-medium uppercase tracking-wide text-robur-steel">{k.label}</p>
              <p className="text-2xl font-black text-robur-charcoal mt-1">{loading ? "—" : k.value}</p>
              <p className="text-[10px] text-robur-steel mt-1">{k.change}</p>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-5">
        {/* Tonnage Chart */}
        <motion.div className="col-span-12 lg:col-span-7" {...fadeIn} transition={{ delay: 0.2 }}>
          <GlassCard level={2} className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-4 w-4 text-robur-yellow" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-robur-steel">Tonnage by Day</h3>
            </div>
            {loading ? (
              <div className="h-40 rounded-xl bg-robur-charcoal/[0.03] animate-pulse" />
            ) : dockets.length === 0 ? (
              <p className="text-xs text-robur-steel/60 text-center py-10">No validated dockets to analyse</p>
            ) : (
              <div className="flex items-end justify-between gap-2 h-40">
                {tonnageData.map((d) => (
                  <div key={d.day} className="flex flex-col items-center gap-2 flex-1">
                    <div className="w-full flex items-end justify-center" style={{ height: "120px" }}>
                      <div
                        className="w-full max-w-[36px] rounded-t-lg bg-gradient-to-t from-robur-charcoal to-robur-charcoal/70 hover:from-robur-yellow hover:to-robur-yellow/70 transition-colors"
                        style={{ height: `${(d.value / maxTonnage) * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-medium text-robur-steel">{d.day}</span>
                    <span className="text-[9px] font-bold text-robur-charcoal">{d.value}t</span>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </motion.div>

        {/* Analysis Insights */}
        <motion.div className="col-span-12 lg:col-span-5" {...fadeIn} transition={{ delay: 0.25 }}>
          <GlassCard level={2} className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Database className="h-4 w-4 text-robur-yellow" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-robur-steel">Analysis Insights</h3>
            </div>
            {loading ? (
              <div className="space-y-2">{[1, 2].map((i) => <div key={i} className="h-14 rounded-xl bg-robur-charcoal/[0.03] animate-pulse" />)}</div>
            ) : insights.length === 0 ? (
              <p className="text-xs text-robur-steel/60 text-center py-8">No insights — validate dockets to generate analysis</p>
            ) : (
              <div className="space-y-2">
                {insights.map((ins) => (
                  <div key={ins.metric} className="flex items-center gap-3 rounded-xl bg-robur-charcoal/[0.03] p-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/60">
                      <TrendingUp className={cn("h-4 w-4", ins.trend === "up" ? "text-emerald-500" : "text-red-400")} strokeWidth={1.5} />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-robur-steel">{ins.metric}</p>
                      <p className="text-xs font-bold text-robur-charcoal">{ins.value}</p>
                      <p className="text-[10px] text-robur-steel">{ins.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </motion.div>

        {/* Generated Reports */}
        <motion.div className="col-span-12" {...fadeIn} transition={{ delay: 0.3 }}>
          <GlassCard level={2} className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-robur-yellow" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-robur-steel">Available Reports</h3>
              </div>
              <button
                onClick={() => setDistributed(true)}
                disabled={distributed || dockets.length === 0}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-bold transition-colors",
                  distributed
                    ? "bg-emerald-100 text-emerald-600 cursor-default"
                    : "bg-robur-yellow text-robur-charcoal hover:bg-robur-yellow/90 disabled:opacity-50"
                )}
              >
                {distributed ? <><CheckCircle className="h-3.5 w-3.5" /> Distributed</> : <><Send className="h-3.5 w-3.5" /> Distribute Pack</>}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {["Weekly Operations Summary", "Tonnage by Site Report", "Driver Performance Report", "Compliance & Audit Report"].map((name) => (
                <div key={name} className="flex items-center gap-3 rounded-xl bg-robur-charcoal/[0.03] p-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/60">
                    <FileText className="h-4 w-4 text-robur-charcoal" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-robur-charcoal truncate">{name}</p>
                    <p className="text-[10px] text-robur-steel">{dockets.length} validated dockets</p>
                  </div>
                  <button className="flex items-center gap-1 rounded-md bg-robur-charcoal/5 px-2 py-1 text-[9px] font-semibold text-robur-steel hover:bg-robur-charcoal/10 transition-colors">
                    <Download className="h-3 w-3" strokeWidth={2} /> PDF
                  </button>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
}