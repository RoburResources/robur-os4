import { useState, useEffect, useMemo } from "react";
import TopBar from "@/components/layout/TopBar";
import GlassCard from "@/components/ui/GlassCard";
import MetricCard from "@/components/ui/MetricCard";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, DollarSign, Percent, AlertTriangle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";

const fadeIn = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

const DEFAULT_RATES = { "Mixed Soil": 85, "Concrete": 120, "Green Waste": 65, "General Waste": 55, "Asphalt": 95, "Brick": 90 };
const TIP_FEES = { "Mixed Soil": 28, "Concrete": 45, "Green Waste": 18, "General Waste": 22, "Asphalt": 35, "Brick": 32 };

export default function MaterialMargin() {
  const [dockets, setDockets] = useState([]);
  const [rateCards, setRateCards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Docket.filter({ status: 'validated' }),
      base44.entities.RateCard.list(),
    ])
      .then(([d, r]) => { setDockets(d); setRateCards(r); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const marginData = useMemo(() => {
    const map = {};
    dockets.forEach(d => {
      const material = d.material || 'Unknown';
      const site = d.site || 'Unknown';
      const key = `${material}__${site}`;
      if (!map[key]) map[key] = { material, site, revenue: 0, cost: 0, weight: 0, count: 0 };
      const rate = rateCards.find(r => r.material === material)?.base_rate_per_tonne || DEFAULT_RATES[material] || 75;
      const tipFee = TIP_FEES[material] || 25;
      map[key].revenue += rate * (d.net_weight || 0);
      map[key].cost += tipFee * (d.net_weight || 0);
      map[key].weight += d.net_weight || 0;
      map[key].count++;
    });
    return Object.values(map).map(m => ({
      ...m,
      margin: m.revenue - m.cost,
      marginPct: m.revenue > 0 ? (m.margin / m.revenue) * 100 : 0,
    })).sort((a, b) => a.marginPct - b.marginPct);
  }, [dockets, rateCards]);

  const totals = useMemo(() => {
    const revenue = marginData.reduce((s, m) => s + m.revenue, 0);
    const cost = marginData.reduce((s, m) => s + m.cost, 0);
    return { revenue, cost, margin: revenue - cost, marginPct: revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0 };
  }, [marginData]);

  const lossMakers = marginData.filter(m => m.marginPct < 25);

  const getHeatColor = (pct) => {
    if (pct < 10) return 'bg-red-100 text-red-700';
    if (pct < 25) return 'bg-orange-100 text-orange-700';
    if (pct < 40) return 'bg-yellow-100 text-yellow-700';
    if (pct < 55) return 'bg-lime-100 text-lime-700';
    return 'bg-emerald-100 text-emerald-700';
  };

  return (
    <div className="max-w-7xl mx-auto">
      <TopBar title="Material Margin Analysis" subtitle="Revenue vs disposal cost by material × site" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <motion.div {...fadeIn} transition={{ delay: 0 }}>
          <MetricCard label="Total Revenue" value={loading ? '—' : `$${totals.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} change={`${dockets.length} dockets`} changeType="up" icon={DollarSign} />
        </motion.div>
        <motion.div {...fadeIn} transition={{ delay: 0.05 }}>
          <MetricCard label="Disposal Costs" value={loading ? '—' : `$${totals.cost.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} change="Tip fees" changeType="down" icon={TrendingDown} />
        </motion.div>
        <motion.div {...fadeIn} transition={{ delay: 0.1 }}>
          <MetricCard label="Gross Margin" value={loading ? '—' : `$${totals.margin.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} change={`${totals.marginPct.toFixed(1)}% margin`} changeType="up" icon={TrendingUp} />
        </motion.div>
        <motion.div {...fadeIn} transition={{ delay: 0.15 }}>
          <MetricCard label="Loss-Making Combos" value={lossMakers.length} change="Below 25% margin" changeType={lossMakers.length > 0 ? 'down' : 'up'} icon={AlertTriangle} />
        </motion.div>
      </div>

      {lossMakers.length > 0 && (
        <motion.div {...fadeIn} transition={{ delay: 0.2 }}>
          <GlassCard level={2} className="p-4 mb-5 border-l-4 border-l-red-400">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" strokeWidth={2} />
              <p className="text-xs font-bold text-red-600">{lossMakers.length} material/site combinations are below 25% margin — consider renegotiating rates or surcharging these clients.</p>
            </div>
          </GlassCard>
        </motion.div>
      )}

      <motion.div {...fadeIn} transition={{ delay: 0.25 }}>
        <GlassCard level={2} className="p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-robur-steel mb-4">Margin Heatmap</h3>
          {loading ? (
            <div className="h-64 animate-pulse rounded-xl bg-robur-charcoal/[0.03]" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-robur-light/30">
                    <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-robur-steel/60">Material</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-robur-steel/60">Site</th>
                    <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-robur-steel/60">Dockets</th>
                    <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-robur-steel/60">Tonnes</th>
                    <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-robur-steel/60">Revenue</th>
                    <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-robur-steel/60">Disposal</th>
                    <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-robur-steel/60">Margin</th>
                    <th className="px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-robur-steel/60">Margin %</th>
                  </tr>
                </thead>
                <tbody>
                  {marginData.map((m, i) => (
                    <tr key={i} className="border-b border-robur-light/15 hover:bg-robur-charcoal/[0.02] transition-colors">
                      <td className="px-3 py-2.5 text-xs font-semibold text-robur-charcoal">{m.material}</td>
                      <td className="px-3 py-2.5 text-xs text-robur-steel">{m.site}</td>
                      <td className="px-3 py-2.5 text-xs text-robur-steel text-right">{m.count}</td>
                      <td className="px-3 py-2.5 text-xs text-robur-steel text-right">{m.weight.toFixed(1)}</td>
                      <td className="px-3 py-2.5 text-xs font-semibold text-robur-charcoal text-right">${m.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                      <td className="px-3 py-2.5 text-xs text-red-500 text-right">${m.cost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                      <td className="px-3 py-2.5 text-xs font-bold text-robur-charcoal text-right">${m.margin.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold", getHeatColor(m.marginPct))}>
                          {m.marginPct.toFixed(0)}%
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