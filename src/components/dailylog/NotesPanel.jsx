import { useState } from "react";
import GlassCard from "@/components/ui/GlassCard";
import { StickyNote, Plus, AlertTriangle, CheckCircle, Info, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { base44 } from "@/api/base44Client";

const noteTypeConfig = {
  general: { label: "General", icon: Info, color: "text-robur-steel", bg: "bg-robur-steel/10" },
  issue: { label: "Issue", icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-500/10" },
  completion: { label: "Completion", icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-500/10" },
  incident: { label: "Incident", icon: Zap, color: "text-red-600", bg: "bg-red-500/10" },
};

export default function NotesPanel({ notes, loading, driverName, shiftDate, onAdded }) {
  const [showForm, setShowForm] = useState(false);
  const [noteType, setNoteType] = useState("general");
  const [content, setContent] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!content.trim()) return;
    setSaving(true);
    try {
      await base44.entities.ServiceNote.create({
        driver_name: driverName,
        shift_date: shiftDate,
        note_type: noteType,
        content: content.trim(),
        vehicle_id: vehicleId.trim() || undefined,
      });
      setContent("");
      setVehicleId("");
      setNoteType("general");
      setShowForm(false);
      onAdded();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <GlassCard level={2} className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <StickyNote className="h-4 w-4 text-robur-yellow" />
        <h3 className="text-sm font-semibold text-robur-charcoal">Service Notes</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="ml-auto flex items-center gap-1 text-[10px] font-semibold text-robur-yellow hover:underline"
        >
          <Plus className="h-3 w-3" strokeWidth={2.5} /> Add Note
        </button>
      </div>

      {showForm && (
        <div className="mb-4 space-y-2 p-3 rounded-xl bg-robur-charcoal/[0.02] border border-robur-light/15">
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(noteTypeConfig).map(([key, cfg]) => {
              const Icon = cfg.icon;
              return (
                <button
                  key={key}
                  onClick={() => setNoteType(key)}
                  className={cn(
                    "flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-semibold transition-all",
                    noteType === key ? `${cfg.bg} ${cfg.color}` : "bg-white/40 text-robur-steel"
                  )}
                >
                  <Icon className="h-3 w-3" /> {cfg.label}
                </button>
              );
            })}
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What happened on this job?"
            rows={3}
            className="w-full rounded-lg border border-robur-light/30 bg-white/60 px-3 py-2 text-xs text-robur-charcoal placeholder:text-robur-steel/40 focus:outline-none focus:ring-2 focus:ring-robur-yellow/30 resize-none"
          />
          <input
            value={vehicleId}
            onChange={(e) => setVehicleId(e.target.value)}
            placeholder="Vehicle (optional)"
            className="w-full rounded-lg border border-robur-light/30 bg-white/60 px-3 py-2 text-xs text-robur-charcoal placeholder:text-robur-steel/40 focus:outline-none focus:ring-2 focus:ring-robur-yellow/30"
          />
          <button
            onClick={handleSave}
            disabled={saving || !content.trim()}
            className="w-full rounded-lg bg-robur-yellow py-2 text-[11px] font-bold text-robur-charcoal disabled:opacity-40 disabled:cursor-not-allowed hover:bg-robur-yellow/90 transition-colors"
          >
            {saving ? "Saving..." : "Save Note"}
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-xs text-robur-steel text-center py-8">Loading notes...</p>
      ) : notes.length === 0 ? (
        <div className="text-center py-8">
          <StickyNote className="h-8 w-8 text-robur-light mx-auto mb-2" />
          <p className="text-xs text-robur-steel">No service notes recorded</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto -mr-1 pr-1">
          {notes.map((n, i) => {
            const cfg = noteTypeConfig[n.note_type] || noteTypeConfig.general;
            const Icon = cfg.icon;
            return (
              <div key={n.id || i} className="flex gap-2.5 rounded-xl bg-white/40 p-3 border border-transparent hover:border-robur-light/20">
                <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", cfg.bg)}>
                  <Icon className={cn("h-3.5 w-3.5", cfg.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-robur-steel">{cfg.label}</span>
                    {n.vehicle_id && <span className="text-[10px] text-robur-light">· {n.vehicle_id}</span>}
                  </div>
                  <p className="text-[11px] text-robur-charcoal leading-relaxed">{n.content}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </GlassCard>
  );
}