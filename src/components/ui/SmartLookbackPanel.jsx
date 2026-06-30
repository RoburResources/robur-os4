import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import GlassCard from "@/components/ui/GlassCard";
import { Lightbulb, MapPin, AlertTriangle, TrendingDown, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";

/**
 * SmartLookbackPanel — identifies recurring patterns from historical
 * ServiceNotes. Surfaces site-specific issues (e.g., "Delays reported
 * at this site 3 times this month") so management can act on trends.
 */

const fadeIn = { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 } };

function analyzePatterns(notes) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Group issue/incident notes by job_id or site reference
  const siteGroups = {};
  notes
    .filter((n) => {
      const noteDate = n.shift_date ? new Date(n.shift_date) : null;
      return noteDate && noteDate >= thirtyDaysAgo && (n.note_type === "issue" || n.note_type === "incident");
    })
    .forEach((n) => {
      const key = n.job_id || n.vehicle_id || "Unknown Site";
      if (!siteGroups[key]) siteGroups[key] = { count: 0, samples: [], type: n.note_type };
      siteGroups[key].count++;
      if (siteGroups[key].samples.length < 2) siteGroups[key].samples.push(n.content);
    });

  return Object.entries(siteGroups)
    .filter(([, v]) => v.count >= 2)
    .map(([key, v]) => ({ site: key, ...v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);
}

export default function SmartLookbackPanel() {
  const [patterns, setPatterns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const notes = await base44.entities.ServiceNote.list("-created_date", 200);
        setPatterns(analyzePatterns(notes));
      } catch {
        setPatterns([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const hasPatterns = patterns.length > 0;

  return (
    <motion.div {...fadeIn} transition={{ delay: 0.35 }}>
      <GlassCard level={2} className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100">
            <Lightbulb className="h-3.5 w-3.5 text-violet-600" strokeWidth={2} />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-robur-charcoal">Smart Lookback</h3>
            <p className="text-[9px] text-robur-steel">Recurring patterns detected in the last 30 days</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 rounded-xl bg-robur-charcoal/[0.03] animate-pulse" />
            ))}
          </div>
        ) : hasPatterns ? (
          <div className="space-y-2">
            {patterns.map((p, i) => (
              <motion.div
                key={p.site}
                {...fadeIn}
                transition={{ delay: 0.1 + i * 0.05 }}
                className="rounded-xl bg-amber-50 border border-amber-200 p-3"
              >
                <div className="flex items-start gap-2.5">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-amber-100">
                    {p.type === "incident" ? (
                      <AlertTriangle className="h-3 w-3 text-red-500" strokeWidth={2} />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-amber-600" strokeWidth={2} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-robur-charcoal">
                      {p.count}× {p.type === "incident" ? "incidents" : "issues"} at {p.site}
                    </p>
                    {p.samples[0] && (
                      <p className="text-[10px] text-robur-steel mt-0.5 truncate">"{p.samples[0]}"</p>
                    )}
                  </div>
                  <Link
                    to="/daily-log"
                    className="flex items-center gap-0.5 text-[10px] font-bold text-robur-charcoal hover:text-robur-yellow transition-colors shrink-0"
                  >
                    Review <ArrowRight className="h-2.5 w-2.5" strokeWidth={2.5} />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6">
            <MapPin className="h-8 w-8 text-emerald-400 mb-2" strokeWidth={1.5} />
            <p className="text-xs text-robur-steel">No recurring issues detected</p>
            <p className="text-[10px] text-robur-steel/60 mt-0.5">Operations running smoothly</p>
          </div>
        )}
      </GlassCard>
    </motion.div>
  );
}