import { useState, useEffect, useCallback } from "react";
import TopBar from "@/components/layout/TopBar";
import ShiftStats from "@/components/dailylog/ShiftStats";
import DocketList from "@/components/dailylog/DocketList";
import NotesPanel from "@/components/dailylog/NotesPanel";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { Calendar, WifiOff, CloudOff } from "lucide-react";

const fadeIn = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

export default function DailyLog() {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const [shiftDate, setShiftDate] = useState(todayStr);
  const [driverName, setDriverName] = useState("");
  const [dockets, setDockets] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const { isOnline, pendingCount } = useOfflineQueue();

  useEffect(() => {
    base44.auth.me().then((u) => setDriverName(u?.full_name || "")).catch(() => {});
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [dockRes, noteRes] = await Promise.all([
        base44.entities.Docket.filter({ date: shiftDate }).catch(() => []),
        base44.entities.ServiceNote.filter({ shift_date: shiftDate }).catch(() => []),
      ]);
      const name = driverName.toLowerCase().trim();
      const filteredDockets = name
        ? dockRes.filter((d) => (d.driver || "").toLowerCase().trim() === name)
        : dockRes;
      const finishedDockets = filteredDockets.filter((d) =>
        ["validated", "generated", "archived"].includes(d.status)
      );
      const filteredNotes = name
        ? noteRes.filter((n) => (n.driver_name || "").toLowerCase().trim() === name)
        : noteRes;
      setDockets(finishedDockets);
      setNotes(filteredNotes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [shiftDate, driverName, refreshKey]);

  useEffect(() => {
    if (driverName) loadData();
  }, [loadData, driverName]);

  const totalNetWeight = dockets.reduce((sum, d) => sum + (d.net_weight || 0), 0);
  const totalGross = dockets.reduce((sum, d) => sum + (d.gross_weight || 0), 0);

  const parseTime = (t) => {
    if (!t) return null;
    const m = t.match(/(\d{1,2}):(\d{2})/);
    if (!m) return null;
    return parseInt(m[1]) * 60 + parseInt(m[2]);
  };

  const times = dockets
    .map((d) => ({ i: parseTime(d.time_in), o: parseTime(d.time_out) }))
    .filter((t) => t.i != null && t.o != null);
  const hoursWorked = times.length > 0
    ? (Math.max(...times.map((t) => t.o)) - Math.min(...times.map((t) => t.i))) / 60
    : 0;

  return (
    <div className="max-w-7xl mx-auto">
      <TopBar title="Daily Log" subtitle="Shift summary compiled from dockets and service notes" />

      {/* Offline indicator */}
      {!isOnline && (
        <motion.div {...fadeIn} className="mb-4 flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5">
          <WifiOff className="h-4 w-4 text-amber-600" />
          <span className="text-xs font-medium text-amber-700">
            You're offline. {pendingCount > 0 ? `${pendingCount} item${pendingCount === 1 ? '' : 's'} queued for sync.` : 'Changes will sync when reconnected.'}
          </span>
        </motion.div>
      )}
      {isOnline && pendingCount > 0 && (
        <motion.div {...fadeIn} className="mb-4 flex items-center gap-2 rounded-xl bg-blue-50 border border-blue-200 px-4 py-2.5">
          <CloudOff className="h-4 w-4 text-blue-600" />
          <span className="text-xs font-medium text-blue-700">
            Syncing {pendingCount} queued item{pendingCount === 1 ? '' : 's'}...
          </span>
        </motion.div>
      )}

      {/* Date + driver selector */}
      <motion.div {...fadeIn} className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-robur-steel/50" />
          <input
            type="date"
            value={shiftDate}
            onChange={(e) => setShiftDate(e.target.value)}
            className="rounded-xl border border-robur-light/30 bg-white/70 pl-9 pr-3 py-2.5 text-sm text-robur-charcoal focus:outline-none focus:ring-2 focus:ring-robur-yellow/30"
          />
        </div>
        <div className="rounded-xl bg-robur-charcoal/[0.03] px-4 py-2.5 text-sm">
          <span className="text-[11px] font-medium text-robur-steel">Driver: </span>
          <span className="font-semibold text-robur-charcoal">{driverName || "—"}</span>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div {...fadeIn} transition={{ delay: 0.05 }} className="mb-5">
        <ShiftStats
          dockets={dockets.length}
          totalNetWeight={totalNetWeight}
          totalGross={totalGross}
          notes={notes.length}
          hoursWorked={hoursWorked}
          loading={loading}
        />
      </motion.div>

      {/* Dockets + Notes */}
      <div className="grid grid-cols-12 gap-5">
        <motion.div className="col-span-12 lg:col-span-7" {...fadeIn} transition={{ delay: 0.1 }}>
          <DocketList dockets={dockets} loading={loading} />
        </motion.div>
        <motion.div className="col-span-12 lg:col-span-5" {...fadeIn} transition={{ delay: 0.15 }}>
          <NotesPanel
            notes={notes}
            loading={loading}
            driverName={driverName}
            shiftDate={shiftDate}
            onAdded={() => setRefreshKey((k) => k + 1)}
          />
        </motion.div>
      </div>
    </div>
  );
}