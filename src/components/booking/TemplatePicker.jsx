import { useState, useEffect } from "react";
import { Bookmark, Plus, Trash2, Check } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import { base44 } from "@/api/base44Client";

export default function TemplatePicker({ onApply, currentBooking }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSave, setShowSave] = useState(false);
  const [name, setName] = useState("");

  const load = () => {
    base44.entities.BookingTemplate.list()
      .then(setTemplates)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!name.trim() || !currentBooking?.service) return;
    setSaving(true);
    try {
      await base44.entities.BookingTemplate.create({
        name: name.trim(),
        service_type: currentBooking.service,
        action_type: currentBooking.action,
        site_address: currentBooking.address,
        latitude: currentBooking.binPosition?.lat,
        longitude: currentBooking.binPosition?.lng,
        placement_notes: currentBooking.notes,
        contact_name: currentBooking.contactName,
        contact_phone: currentBooking.contactPhone,
      });
      setName("");
      setShowSave(false);
      load();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await base44.entities.BookingTemplate.delete(id);
      load();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return null;

  if (templates.length === 0 && !showSave) {
    return (
      <GlassCard level={1} className="p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bookmark className="h-3.5 w-3.5 text-robur-steel" />
            <span className="text-[11px] font-medium text-robur-steel">No saved templates yet</span>
          </div>
          <button onClick={() => setShowSave(true)} className="flex items-center gap-1 text-[10px] font-semibold text-robur-yellow hover:underline">
            <Plus className="h-3 w-3" /> Save current
          </button>
        </div>
      </GlassCard>
    );
  }

  return (
    <div className="mb-4">
      <GlassCard level={1} className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Bookmark className="h-3.5 w-3.5 text-robur-yellow" />
            <span className="text-[11px] font-semibold text-robur-charcoal">Quick Templates</span>
          </div>
          <button onClick={() => setShowSave(!showSave)} className="flex items-center gap-1 text-[10px] font-semibold text-robur-yellow hover:underline">
            <Plus className="h-3 w-3" /> Save current
          </button>
        </div>

        {showSave && (
          <div className="flex gap-2 mb-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Template name..."
              className="flex-1 rounded-lg border border-robur-light/30 bg-white/60 px-3 py-2 text-xs text-robur-charcoal placeholder:text-robur-steel/40 focus:outline-none focus:ring-2 focus:ring-robur-yellow/30"
            />
            <button
              onClick={handleSave}
              disabled={saving || !name.trim() || !currentBooking?.service}
              className="flex items-center gap-1 rounded-lg bg-robur-charcoal px-3 py-2 text-[10px] font-bold text-white disabled:opacity-40"
            >
              <Check className="h-3 w-3" /> Save
            </button>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {templates.map((tpl) => (
            <div key={tpl.id} className="group flex items-center gap-1 rounded-lg bg-white/60 border border-robur-light/20 pl-3 pr-1 py-1.5 hover:border-robur-yellow/40 transition-colors">
              <button
                onClick={() => onApply(tpl)}
                className="text-[11px] font-medium text-robur-charcoal"
              >
                {tpl.name}
              </button>
              <button
                onClick={() => handleDelete(tpl.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
              >
                <Trash2 className="h-3 w-3 text-robur-steel/50 hover:text-red-500" />
              </button>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}