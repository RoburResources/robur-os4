import { useState, useMemo } from "react";
import GlassCard from "@/components/ui/GlassCard";
import { Route, Navigation, ArrowDownUp, Check } from "lucide-react";

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function optimizeNearestNeighbor(jobs) {
  if (jobs.length <= 1) return { route: jobs, totalKm: 0 };
  const route = [jobs[0]];
  const remaining = [...jobs.slice(1)];
  let totalKm = 0;

  while (remaining.length > 0) {
    const last = route[route.length - 1];
    let nearestIdx = 0;
    let nearestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversine(last.latitude, last.longitude, remaining[i].latitude, remaining[i].longitude);
      if (d < nearestDist) { nearestDist = d; nearestIdx = i; }
    }
    totalKm += nearestDist;
    route.push(remaining.splice(nearestIdx, 1)[0]);
  }
  return { route, totalKm };
}

export default function RouteOptimizer({ jobs }) {
  const [optimized, setOptimized] = useState(false);

  const multiStopJobs = useMemo(
    () => jobs.filter(j => j.latitude && j.longitude && j.status !== 'completed'),
    [jobs]
  );

  const { route, totalKm } = useMemo(() => optimizeNearestNeighbor(multiStopJobs), [multiStopJobs]);

  const originalKm = useMemo(() => {
    let km = 0;
    for (let i = 1; i < multiStopJobs.length; i++) {
      km += haversine(multiStopJobs[i - 1].latitude, multiStopJobs[i - 1].longitude, multiStopJobs[i].latitude, multiStopJobs[i].longitude);
    }
    return km;
  }, [multiStopJobs]);

  const savings = originalKm > 0 ? Math.round(((originalKm - totalKm) / originalKm) * 100) : 0;

  if (multiStopJobs.length < 3) {
    return (
      <GlassCard level={2} className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Route className="h-4 w-4 text-robur-yellow" strokeWidth={2} />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-robur-steel">Route Optimizer</h3>
        </div>
        <p className="text-xs text-robur-steel/60">3+ jobs with GPS coordinates needed to optimize. Currently {multiStopJobs.length} eligible.</p>
      </GlassCard>
    );
  }

  const displayRoute = optimized ? route : multiStopJobs;

  return (
    <GlassCard level={2} className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Route className="h-4 w-4 text-robur-yellow" strokeWidth={2} />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-robur-steel">Route Optimizer</h3>
        </div>
        <button
          onClick={() => setOptimized(!optimized)}
          className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-bold transition-colors ${
            optimized ? 'bg-emerald-100 text-emerald-600' : 'bg-robur-yellow text-robur-charcoal hover:bg-robur-yellow/90'
          }`}
        >
          {optimized ? <><Check className="h-3 w-3" strokeWidth={2.5} /> Optimized</> : <><ArrowDownUp className="h-3 w-3" strokeWidth={2} /> Optimize</>}
        </button>
      </div>

      {optimized && savings > 0 && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2">
          <Navigation className="h-3.5 w-3.5 text-emerald-500" strokeWidth={2} />
          <span className="text-[10px] font-bold text-emerald-600">{savings}% distance saved · {totalKm.toFixed(1)}km vs {originalKm.toFixed(1)}km</span>
        </div>
      )}

      <div className="space-y-1.5">
        {displayRoute.map((job, i) => (
          <div key={job.id} className="flex items-center gap-2.5 rounded-lg bg-robur-charcoal/[0.03] p-2.5">
            <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${
              optimized ? 'bg-robur-yellow text-robur-charcoal' : 'bg-robur-charcoal/10 text-robur-steel'
            }`}>
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-robur-charcoal truncate">{job.title || job.job_id}</p>
              <p className="text-[10px] text-robur-steel truncate">{job.client} · {job.site_address || '—'}</p>
            </div>
            {i < displayRoute.length - 1 && (
              <div className="text-[10px] text-robur-steel/40">↓</div>
            )}
          </div>
        ))}
      </div>
    </GlassCard>
  );
}