import { useState, useEffect, useMemo } from "react";
import TopBar from "@/components/layout/TopBar";
import GlassCard from "@/components/ui/GlassCard";
import MetricCard from "@/components/ui/MetricCard";
import { motion } from "framer-motion";
import { Award, TrendingUp, AlertTriangle, Truck } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";

const fadeIn = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

export default function DriverScorecard() {
  const [dockets, setDockets] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Docket.filter({ status: 'validated' }),
      base44.entities.ServiceNote.list('-created_date', 200),
    ])
      .then(([d, n]) => { setDockets(d); setNotes(n); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const drivers = useMemo(() => {
    const map = {};
    dockets.forEach(d => {
      const driver = d.driver || 'Unknown';
      if (!map[driver]) map[driver] = { name: driver, dockets: 0, tonnes: 0, jobs: new Set() };
      map[driver].dockets++;
      map[driver].tonnes += d.net_weight || 0;
      map[driver].jobs.add(d.docket_no);
    });

    notes.forEach(n => {
      const driver = n.driver_name || 'Unknown';
      if (!map[driver]) map[driver] = { name: driver, dockets: 0, tonnes: 0, jobs: new Set() };
      if (!map[driver].incidents) map[driver].incidents = 0;
      if (n.note_type === 'incident' || n.note_type === 'issue') map[driver].incidents++;
    });

    return Object.values(map).map(d => ({
      ...d,
      jobCount: d.jobs.size,
      incidents: d.incidents || 0,
      avgTonnesPerDocket: d.dockets > 0 ? d.tonnes / d.dockets : 0,
      score: Math.max(0, Math.min(100, 50 + d.dockets * 3 - (d.incidents || 0) * 10 + (d.tonnes > 50 ? 10 : 0))),
    })).sort((a, b) => b.score - a.score);
  }, [dockets, notes]);

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-emerald-600 bg-emerald-50';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50';
    if (score >= 40) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  const getMedal = (i) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';

  return (
    <div className="max-w-7xl mx-auto">
      <TopBar title="Driver Performance" subtitle="Benchmarking dockets, tonnage & safety" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <motion.div {...fadeIn} transition={{ delay: 0 }}>
          <MetricCard label="Active Drivers" value={loading ? '—' : drivers.length} change="This period" changeType="up" icon={Truck} />
        </motion.div>
        <motion.div {...fadeIn} transition={{ delay: 0.05 }}>
          <MetricCard label="Total Dockets" value={loading ? '—' : dockets.length} change="Validated" changeType="up" icon={TrendingUp} />
        </motion.div>
        <motion.div {...fadeIn} transition={{ delay: 0.1 }}>
          <MetricCard label="Total Tonnes" value={loading ? '—' : drivers.reduce((s, d) => s + d.tonnes, 0).toFixed(0)} change="Moved" changeType="up" icon={TrendingUp} />
        </motion.div>
        <motion.div {...fadeIn} transition={{ delay: 0.15 }}>
          <MetricCard label="Incidents" value={loading ? '—' : drivers.reduce((s, d) => s + d.incidents, 0)} change="Reported" changeType={drivers.reduce((s, d) => s + d.incidents, 0) > 0 ? 'down' : 'up'} icon={AlertTriangle} />
        </motion.div>
      </div>

      <motion.div {...fadeIn} transition={{ delay: 0.2 }}>
        <GlassCard level={2} className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Award className="h-4 w-4 text-robur-yellow" strokeWidth={2} />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-robur-steel">Driver Scorecard</h3>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-16 rounded-xl bg-robur-charcoal/[0.03] animate-pulse" />)}
            </div>
          ) : drivers.length === 0 ? (
            <p className="text-xs text-robur-steel/60 py-8 text-center">No driver data available. Validate dockets to see scorecards.</p>
          ) : (
            <div className="space-y-2">
              {drivers.map((d, i) => (
                <div key={d.name} className={cn("flex items-center gap-3 rounded-xl p-3 transition-colors", i === 0 ? 'bg-robur-yellow/10' : 'bg-robur-charcoal/[0.03]')}>
                  <span className="text-lg w-8 text-center">{getMedal(i) || <span className="text-xs text-robur-steel/40">{i + 1}</span>}</span>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-robur-charcoal text-white">
                    <span className="text-xs font-bold">{d.name.split(' ').map(w => w[0]).join('').slice(0, 2)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-robur-charcoal">{d.name}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[10px] text-robur-steel">{d.dockets} dockets</span>
                      <span className="text-[10px] text-robur-steel">{d.tonnes.toFixed(1)} t</span>
                      <span className="text-[10px] text-robur-steel">{d.avgTonnesPerDocket.toFixed(1)} t/job avg</span>
                      {d.incidents > 0 && <span className="text-[10px] font-semibold text-red-500">{d.incidents} incident{d.incidents > 1 ? 's' : ''}</span>}
                    </div>
                  </div>
                  <div className={cn("flex h-12 w-12 flex-col items-center justify-center rounded-xl", getScoreColor(d.score))}>
                    <span className="text-lg font-black leading-none">{Math.round(d.score)}</span>
                    <span className="text-[8px] font-semibold uppercase">score</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </motion.div>
    </div>
  );
}