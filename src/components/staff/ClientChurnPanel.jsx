import { useState, useEffect } from "react";
import GlassCard from "@/components/ui/GlassCard";
import { Users, AlertTriangle, TrendingDown, Phone, Mail } from "lucide-react";
import { detectClientChurn } from "@/functions/detectClientChurn";
import { cn } from "@/lib/utils";

const riskConfig = {
  critical: { color: 'bg-red-50 text-red-600 border-red-200', dot: 'bg-red-500', label: 'Critical' },
  warning: { color: 'bg-orange-50 text-orange-600 border-orange-200', dot: 'bg-orange-500', label: 'At Risk' },
  healthy: { color: 'bg-emerald-50 text-emerald-600 border-emerald-200', dot: 'bg-emerald-500', label: 'Healthy' },
};

export default function ClientChurnPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    detectClientChurn({})
      .then(res => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const alerts = (data?.alerts || []).filter(a => a.risk_level !== 'healthy');
  const critical = alerts.filter(a => a.risk_level === 'critical').length;

  return (
    <GlassCard level={2} className="p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-robur-yellow" strokeWidth={2} />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-robur-steel">Client Churn Watch</h3>
        </div>
        {critical > 0 && (
          <span className="flex items-center gap-1 rounded-md bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">
            <AlertTriangle className="h-2.5 w-2.5" strokeWidth={2.5} /> {critical} critical
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl bg-robur-charcoal/[0.03] animate-pulse" />)}
        </div>
      ) : alerts.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <Users className="h-8 w-8 text-emerald-300" strokeWidth={1.5} />
          <p className="text-xs text-robur-steel/60">All clients healthy — no churn risk detected.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.slice(0, 6).map((a, i) => {
            const cfg = riskConfig[a.risk_level] || riskConfig.warning;
            return (
              <div key={i} className={cn("rounded-xl border p-3", cfg.color)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={cn("h-2 w-2 rounded-full", cfg.dot)} />
                    <span className="text-sm font-bold text-robur-charcoal">{a.client}</span>
                  </div>
                  <span className="text-[10px] font-bold">{cfg.label}</span>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <span className="text-[10px] text-robur-steel">{a.recent_jobs} recent jobs</span>
                  <TrendingDown className="h-2.5 w-2.5 text-robur-steel/40" />
                  <span className="text-[10px] text-robur-steel">{a.prior_jobs} prior</span>
                  <span className="ml-auto text-[10px] font-bold">↓ {a.drop_pct}%</span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[10px] text-robur-steel/50">Last job: {a.last_job}</span>
                  <button className="ml-auto flex items-center gap-1 rounded-md bg-white/60 px-2 py-0.5 text-[9px] font-semibold text-robur-charcoal hover:bg-white transition-colors">
                    <Phone className="h-2.5 w-2.5" strokeWidth={2} /> Call
                  </button>
                  <button className="flex items-center gap-1 rounded-md bg-white/60 px-2 py-0.5 text-[9px] font-semibold text-robur-charcoal hover:bg-white transition-colors">
                    <Mail className="h-2.5 w-2.5" strokeWidth={2} /> Email
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </GlassCard>
  );
}