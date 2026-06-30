import { useState, useEffect } from "react";
import GlassCard from "@/components/ui/GlassCard";
import { Fuel, AlertTriangle, RefreshCw, TrendingDown } from "lucide-react";
import { detectFuelAnomalies } from "@/functions/detectFuelAnomalies";
import { cn } from "@/lib/utils";

const severityConfig = {
  critical: { color: 'bg-red-50 text-red-600 border-red-200', label: 'Critical' },
  warning: { color: 'bg-orange-50 text-orange-600 border-orange-200', label: 'Warning' },
  normal: { color: 'bg-emerald-50 text-emerald-600 border-emerald-200', label: 'Normal' },
};

export default function FuelAnomalyPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    detectFuelAnomalies({})
      .then(res => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const anomalies = data?.anomalies || [];

  return (
    <GlassCard level={2} className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Fuel className="h-4 w-4 text-robur-yellow" strokeWidth={2} />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-robur-steel">Fuel Anomaly Detection</h3>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 rounded-lg bg-robur-charcoal/5 px-2.5 py-1.5 text-xs font-medium text-robur-steel hover:bg-robur-charcoal/10 transition-colors">
          <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} strokeWidth={2} />
          Scan
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl bg-robur-charcoal/[0.03] animate-pulse" />)}</div>
      ) : anomalies.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <Fuel className="h-8 w-8 text-emerald-300" strokeWidth={1.5} />
          <p className="text-xs text-robur-steel/60">No fuel anomalies detected. All vehicles within expected range.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {anomalies.map((a, i) => {
            const cfg = severityConfig[a.severity] || severityConfig.warning;
            return (
              <div key={i} className={cn("rounded-xl border p-3", cfg.color)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2} />
                    <span className="text-sm font-bold text-robur-charcoal">{a.vehicle_id}</span>
                    {a.driver && <span className="text-[10px] text-robur-steel">· {a.driver}</span>}
                  </div>
                  <span className="text-[10px] font-bold">{cfg.label}</span>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <div className="text-center">
                    <p className="text-[9px] text-robur-steel/60 uppercase">Fuel</p>
                    <p className="text-sm font-bold text-robur-charcoal">{a.fuel_pct ?? '—'}%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] text-robur-steel/60 uppercase">Jobs</p>
                    <p className="text-sm font-bold text-robur-charcoal">{a.jobs_completed}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] text-robur-steel/60 uppercase">Variance</p>
                    <p className="text-sm font-bold text-red-500">+{a.variance}%</p>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-[10px] text-robur-steel">
                  <TrendingDown className="h-2.5 w-2.5" />
                  <span>Expected {a.expected_fuel_used}% used, actual {a.actual_fuel_used}%</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </GlassCard>
  );
}