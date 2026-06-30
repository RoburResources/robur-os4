import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Clock, GripHorizontal } from "lucide-react";
import EtaConfidenceBadge from "@/components/ui/EtaConfidenceBadge";

/**
 * JobTimeline — interactive horizontal timeline where job blocks can be
 * dragged to reschedule. Shows the direct impact of time changes visually.
 *
 * Each job block is positioned by its scheduled time and has a width
 * proportional to its estimated duration.
 */

const HOURS_START = 6;
const HOURS_END = 20;
const TOTAL_HOURS = HOURS_END - HOURS_START;

function timeToPercent(timeStr) {
  if (!timeStr) return 50;
  const d = new Date(timeStr);
  let hours = d.getHours() + d.getMinutes() / 60;
  if (hours < HOURS_START) hours = HOURS_START;
  if (hours > HOURS_END) hours = HOURS_END;
  return ((hours - HOURS_START) / TOTAL_HOURS) * 100;
}

function percentToTime(percent) {
  const hours = HOURS_START + (percent / 100) * TOTAL_HOURS;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

const statusColors = {
  created: "bg-sky-100 text-sky-700 border-sky-300",
  scheduled: "bg-sky-100 text-sky-700 border-sky-300",
  assigned: "bg-amber-100 text-amber-700 border-amber-300",
  dispatched: "bg-emerald-100 text-emerald-700 border-emerald-300",
  en_route: "bg-emerald-100 text-emerald-700 border-emerald-300",
  completed: "bg-emerald-200 text-emerald-800 border-emerald-400",
};

export default function JobTimeline({ jobs = [], onReschedule }) {
  const [draggingId, setDraggingId] = useState(null);
  const trackRef = useRef(null);

  const handleMouseDown = useCallback((e, job) => {
    e.preventDefault();
    setDraggingId(job.id);
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!draggingId || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
    const newTime = percentToTime(percent);
    onReschedule?.(draggingId, newTime);
  }, [draggingId, onReschedule]);

  const handleMouseUp = useCallback(() => {
    setDraggingId(null);
  }, []);

  const hours = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => HOURS_START + i);

  return (
    <div
      className="select-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Hour markers */}
      <div className="flex justify-between mb-1 px-0.5">
        {hours.map((h) => (
          <div key={h} className="flex flex-col items-center">
            <span className="text-[9px] font-medium text-robur-steel/60">
              {h.toString().padStart(2, "0")}:00
            </span>
          </div>
        ))}
      </div>

      {/* Timeline track */}
      <div
        ref={trackRef}
        className="relative h-28 rounded-xl bg-robur-charcoal/[0.03] border border-robur-light/20 overflow-hidden"
      >
        {/* Grid lines */}
        <div className="absolute inset-0 flex justify-between pointer-events-none">
          {hours.map((_, i) => (
            <div key={i} className="h-full w-px bg-robur-light/15" />
          ))}
        </div>

        {/* Now indicator */}
        {(() => {
          const now = new Date();
          const nowHours = now.getHours() + now.getMinutes() / 60;
          if (nowHours < HOURS_START || nowHours > HOURS_END) return null;
          const percent = ((nowHours - HOURS_START) / TOTAL_HOURS) * 100;
          return (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-robur-yellow z-10"
              style={{ left: `${percent}%` }}
            >
              <div className="absolute -top-0.5 -left-1 h-2 w-2 rounded-full bg-robur-yellow" />
              <span className="absolute -top-4 -left-3 text-[8px] font-bold text-robur-yellow">NOW</span>
            </div>
          );
        })()}

        {/* Job blocks */}
        {jobs.map((job, i) => {
          const left = timeToPercent(job.scheduled_time);
          const width = 8; // each job takes ~8% of timeline (~1hr)
          const isDragging = draggingId === job.id;
          const colors = statusColors[job.status] || statusColors.created;

          return (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              onMouseDown={(e) => handleMouseDown(e, job)}
              className={cn(
                "absolute h-10 rounded-lg border cursor-grab active:cursor-grabbing transition-shadow",
                colors,
                isDragging && "ring-2 ring-robur-yellow shadow-lg z-20 cursor-grabbing",
                !isDragging && "hover:shadow-md"
              )}
              style={{
                left: `${Math.max(0, Math.min(92, left - width / 2))}%`,
                width: `${width}%`,
                top: `${(i % 3) * 14 + 4}px`,
              }}
            >
              <div className="flex items-center gap-1 px-1.5 h-full overflow-hidden">
                <GripHorizontal className="h-2.5 w-2.5 shrink-0 opacity-50" />
                <span className="text-[8px] font-bold truncate">{job.job_id}</span>
                <EtaConfidenceBadge job={job} size="sm" />
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="flex items-center gap-1.5 mt-2 text-[10px] text-robur-steel/60">
        <Clock className="h-3 w-3" />
        <span>Drag job blocks to reschedule · Yellow line = current time</span>
      </div>
    </div>
  );
}