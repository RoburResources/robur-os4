import { useState } from "react";
import { X, User, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const statusOptions = [
  { value: "created", label: "Created" },
  { value: "scheduled", label: "Scheduled" },
  { value: "assigned", label: "Assigned" },
  { value: "dispatched", label: "Dispatched" },
  { value: "en_route", label: "En Route" },
  { value: "completed", label: "Completed" },
];

export default function BulkActionBar({ selectedCount, onAssignDriver, onStatusChange, onClear, processing }) {
  const [driverName, setDriverName] = useState("");
  const [status, setStatus] = useState("");

  const handleAssign = () => {
    if (!driverName.trim()) return;
    onAssignDriver(driverName.trim());
    setDriverName("");
  };

  const handleStatus = () => {
    if (!status) return;
    onStatusChange(status);
    setStatus("");
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-2xl">
      <div className="glass-3 rounded-2xl px-4 py-3 flex flex-wrap items-center gap-3 shadow-xl">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-robur-yellow text-[11px] font-bold text-robur-charcoal">
            {selectedCount}
          </span>
          <span className="text-xs font-semibold text-robur-charcoal">selected</span>
        </div>

        <div className="h-6 w-px bg-robur-light/30" />

        {/* Assign driver */}
        <div className="flex items-center gap-1.5">
          <div className="relative">
            <User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-robur-steel/50" />
            <input
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAssign()}
              placeholder="Assign driver..."
              className="w-36 rounded-lg border border-robur-light/30 bg-white/70 pl-8 pr-2 py-1.5 text-[11px] text-robur-charcoal placeholder:text-robur-steel/40 focus:outline-none focus:ring-2 focus:ring-robur-yellow/30"
            />
          </div>
          <button
            onClick={handleAssign}
            disabled={processing || !driverName.trim()}
            className="flex items-center gap-1 rounded-lg bg-robur-charcoal px-2.5 py-1.5 text-[10px] font-bold text-white disabled:opacity-40 hover:bg-robur-charcoal/90 transition-colors"
          >
            <ArrowRight className="h-3 w-3" /> Assign
          </button>
        </div>

        {/* Change status */}
        <div className="flex items-center gap-1.5">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-robur-light/30 bg-white/70 px-2 py-1.5 text-[11px] text-robur-charcoal focus:outline-none focus:ring-2 focus:ring-robur-yellow/30"
          >
            <option value="">Set status...</option>
            {statusOptions.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <button
            onClick={handleStatus}
            disabled={processing || !status}
            className="rounded-lg bg-robur-yellow px-2.5 py-1.5 text-[10px] font-bold text-robur-charcoal disabled:opacity-40 hover:bg-robur-yellow/90 transition-colors"
          >
            Apply
          </button>
        </div>

        <button
          onClick={onClear}
          className="ml-auto flex items-center gap-1 text-[11px] font-medium text-robur-steel hover:text-robur-charcoal transition-colors"
        >
          <X className="h-3.5 w-3.5" /> Clear
        </button>
      </div>
    </div>
  );
}