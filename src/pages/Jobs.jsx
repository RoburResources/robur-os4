import { useState, useEffect } from "react";
import TopBar from "@/components/layout/TopBar";
import JobBoard from "@/components/jobs/JobBoard";
import JobDetails from "@/components/jobs/JobDetails";
import DispatchStepper from "@/components/jobs/DispatchStepper";
import LiveJobTracking from "@/components/jobs/LiveJobTracking";
import BulkActionBar from "@/components/jobs/BulkActionBar";
import JobTimeline from "@/components/jobs/JobTimeline";
import { setActionContext } from "@/components/ui/QuickActionMenu";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import GlassCard from "@/components/ui/GlassCard";

const fadeIn = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

const statusOrder = ["created", "scheduled", "assigned", "dispatched", "en_route", "completed"];

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Realtime subscription — syncs job changes across all clients instantly
  useEffect(() => {
    base44.entities.Job.list()
      .then((data) => { setJobs(data); if (data.length > 0 && !selectedJob) setSelectedJob(data[0]); })
      .catch(() => {})
      .finally(() => setLoading(false));

    const unsubscribe = base44.entities.Job.subscribe((event) => {
      if (event.type === "create") {
        setJobs((prev) => prev.some((j) => j.id === event.data.id) ? prev : [event.data, ...prev]);
      } else if (event.type === "update") {
        setJobs((prev) => prev.map((j) => (j.id === event.data.id ? event.data : j)));
        setSelectedJob((prev) => (prev?.id === event.data.id ? event.data : prev));
      } else if (event.type === "delete") {
        setJobs((prev) => prev.filter((j) => j.id !== event.data.id));
      }
    });
    return () => { if (typeof unsubscribe === "function") unsubscribe(); };
  }, []);
  const [selectedJob, setSelectedJob] = useState(null);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [processing, setProcessing] = useState(false);

  const handleReschedule = async (jobId, newTime) => {
    setJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, scheduled_time: newTime } : j))
    );
    try {
      await base44.entities.Job.update(jobId, { scheduled_time: newTime });
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (selectedJob) {
      setActionContext({ type: "job", id: selectedJob.id, data: selectedJob });
    }
    return () => setActionContext(null);
  }, [selectedJob]);



  const filtered = jobs.filter(
    (j) =>
      j.job_id?.toLowerCase().includes(search.toLowerCase()) ||
      j.client?.toLowerCase().includes(search.toLowerCase()) ||
      j.title?.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdvance = async (job) => {
    const currentIdx = statusOrder.indexOf(job.status);
    if (currentIdx >= statusOrder.length - 1) return;
    const nextStatus = statusOrder[currentIdx + 1];
    // Optimistic — update UI immediately
    setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, status: nextStatus } : j)));
    setSelectedJob((prev) => (prev?.id === job.id ? { ...prev, status: nextStatus } : prev));
    try {
      const updated = await base44.entities.Job.update(job.id, { status: nextStatus });
      setJobs((prev) => prev.map((j) => (j.id === job.id ? updated : j)));
      setSelectedJob(updated);
    } catch (err) {
      // Rollback on error
      setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, status: job.status } : j)));
      setSelectedJob((prev) => (prev?.id === job.id ? { ...prev, status: job.status } : prev));
      console.error(err);
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    setSelectedIds((prev) =>
      prev.length === filtered.length ? [] : filtered.map((j) => j.id)
    );
  };

  const handleBulkAssignDriver = async (driverName) => {
    setProcessing(true);
    try {
      const updates = selectedIds.map((id) => ({
        id,
        vehicle_id: driverName,
      }));
      await base44.entities.Job.bulkUpdate(updates);
      setJobs((prev) =>
        prev.map((j) =>
          selectedIds.includes(j.id) ? { ...j, vehicle_id: driverName } : j
        )
      );
      setSelectedIds([]);
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkStatusChange = async (status) => {
    setProcessing(true);
    try {
      const updates = selectedIds.map((id) => ({ id, status }));
      await base44.entities.Job.bulkUpdate(updates);
      setJobs((prev) =>
        prev.map((j) =>
          selectedIds.includes(j.id) ? { ...j, status } : j
        )
      );
      if (selectedJob && selectedIds.includes(selectedJob.id)) {
        setSelectedJob((prev) => ({ ...prev, status }));
      }
      setSelectedIds([]);
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-24">
      <TopBar title="Job Management" subtitle="Plan, schedule and deliver with confidence" />

      {/* Interactive Timeline */}
      <motion.div className="mb-4" {...fadeIn} transition={{ delay: 0.05 }}>
        <GlassCard level={2} className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-robur-steel">Schedule Timeline</h3>
            <span className="text-[10px] text-robur-steel/60">Drag to reschedule</span>
          </div>
          <JobTimeline jobs={filtered} onReschedule={handleReschedule} />
        </GlassCard>
      </motion.div>

      <div className="grid grid-cols-12 gap-4" style={{ minHeight: "calc(100vh - 220px)" }}>
        <motion.div className="col-span-12 lg:col-span-3" {...fadeIn}>
          <JobBoard
            jobs={filtered}
            selectedJob={selectedJob}
            onSelect={setSelectedJob}
            search={search}
            onSearch={setSearch}
            onNewJob={() => (window.location.href = "/booking")}
            loading={loading}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onToggleSelectAll={handleToggleSelectAll}
          />
        </motion.div>

        <motion.div className="col-span-12 lg:col-span-5 space-y-4" {...fadeIn} transition={{ delay: 0.05 }}>
          <JobDetails job={selectedJob} />
          <DispatchStepper job={selectedJob} onAdvance={handleAdvance} />
        </motion.div>

        <motion.div className="col-span-12 lg:col-span-4" {...fadeIn} transition={{ delay: 0.1 }}>
          <LiveJobTracking job={selectedJob} />
        </motion.div>
      </div>

      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
          >
            <BulkActionBar
              selectedCount={selectedIds.length}
              onAssignDriver={handleBulkAssignDriver}
              onStatusChange={handleBulkStatusChange}
              onClear={() => setSelectedIds([])}
              processing={processing}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}