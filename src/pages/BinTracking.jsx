import { useState, useEffect } from "react";
import TopBar from "@/components/layout/TopBar";
import GlassCard from "@/components/ui/GlassCard";
import MetricCard from "@/components/ui/MetricCard";
import { motion } from "framer-motion";
import { Package, AlertTriangle, Wrench, CheckCircle, Plus } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const fadeIn = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

const statusConfig = {
  placed: { color: 'bg-emerald-50 text-emerald-600', label: 'Placed' },
  in_transit: { color: 'bg-blue-50 text-blue-600', label: 'In Transit' },
  at_depot: { color: 'bg-robur-charcoal/5 text-robur-steel', label: 'At Depot' },
  maintenance: { color: 'bg-orange-50 text-orange-600', label: 'Maintenance' },
  retired: { color: 'bg-red-50 text-red-500', label: 'Retired' },
};

export default function BinTracking() {
  const [bins, setBins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ bin_id: '', type: 'Skip 6m³', client: '', site_address: '', size: '6m³' });

  const load = () => {
    setLoading(true);
    base44.entities.Bin.list('-updated_date', 100)
      .then(setBins)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.bin_id) return;
    try {
      await base44.entities.Bin.create({
        ...form,
        status: 'placed',
        placement_date: new Date().toISOString().split('T')[0],
        utilization_pct: 0,
        condition_pct: 100,
        days_on_site: 0,
      });
      setForm({ bin_id: '', type: 'Skip 6m³', client: '', site_address: '', size: '6m³' });
      setShowForm(false);
      load();
    } catch (err) { console.error(err); }
  };

  const handleStatusChange = async (bin, status) => {
    await base44.entities.Bin.update(bin.id, { status });
    load();
  };

  const stats = {
    total: bins.length,
    placed: bins.filter(b => b.status === 'placed').length,
    maintenance: bins.filter(b => b.status === 'maintenance').length,
    needsReplacement: bins.filter(b => (b.condition_pct ?? 100) < 40).length,
  };

  return (
    <div className="max-w-7xl mx-auto">
      <TopBar title="Bin & Asset Lifecycle" subtitle="Track placement, utilization and replacement" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <motion.div {...fadeIn} transition={{ delay: 0 }}>
          <MetricCard label="Total Bins" value={loading ? '—' : stats.total} change="All assets" changeType="up" icon={Package} />
        </motion.div>
        <motion.div {...fadeIn} transition={{ delay: 0.05 }}>
          <MetricCard label="On Site" value={loading ? '—' : stats.placed} change="Currently placed" changeType="up" icon={CheckCircle} />
        </motion.div>
        <motion.div {...fadeIn} transition={{ delay: 0.1 }}>
          <MetricCard label="In Maintenance" value={loading ? '—' : stats.maintenance} change="Being repaired" changeType={stats.maintenance > 0 ? 'down' : 'up'} icon={Wrench} />
        </motion.div>
        <motion.div {...fadeIn} transition={{ delay: 0.15 }}>
          <MetricCard label="Needs Replacement" value={loading ? '—' : stats.needsReplacement} change="Condition < 40%" changeType={stats.needsReplacement > 0 ? 'down' : 'up'} icon={AlertTriangle} />
        </motion.div>
      </div>

      <motion.div {...fadeIn} transition={{ delay: 0.2 }}>
        <GlassCard level={2} className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-robur-steel">Asset Register</h3>
            <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 rounded-lg bg-robur-yellow px-3 py-1.5 text-xs font-bold text-robur-charcoal hover:bg-robur-yellow/90 transition-colors">
              <Plus className="h-3 w-3" strokeWidth={2.5} /> Add Bin
            </button>
          </div>

          {showForm && (
            <div className="mb-4 grid grid-cols-2 lg:grid-cols-5 gap-2 rounded-xl bg-robur-charcoal/[0.03] p-3">
              <input placeholder="Bin ID" value={form.bin_id} onChange={e => setForm(f => ({ ...f, bin_id: e.target.value }))} className="rounded-lg border border-robur-light/40 bg-white px-3 py-1.5 text-xs" />
              <input placeholder="Type" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="rounded-lg border border-robur-light/40 bg-white px-3 py-1.5 text-xs" />
              <input placeholder="Client" value={form.client} onChange={e => setForm(f => ({ ...f, client: e.target.value }))} className="rounded-lg border border-robur-light/40 bg-white px-3 py-1.5 text-xs" />
              <input placeholder="Site Address" value={form.site_address} onChange={e => setForm(f => ({ ...f, site_address: e.target.value }))} className="rounded-lg border border-robur-light/40 bg-white px-3 py-1.5 text-xs" />
              <button onClick={handleCreate} className="rounded-lg bg-robur-charcoal px-3 py-1.5 text-xs font-bold text-white hover:bg-robur-charcoal/90">Create</button>
            </div>
          )}

          {loading ? (
            <div className="space-y-2">{[1, 2, 3, 4].map(i => <div key={i} className="h-16 rounded-xl bg-robur-charcoal/[0.03] animate-pulse" />)}</div>
          ) : bins.length === 0 ? (
            <p className="text-xs text-robur-steel/60 py-8 text-center">No bins registered yet. Add bins to start tracking their lifecycle.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-robur-light/30">
                    <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-robur-steel/60">Bin ID</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-robur-steel/60">Type</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-robur-steel/60">Client</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-robur-steel/60">Site</th>
                    <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-robur-steel/60">Days On Site</th>
                    <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-robur-steel/60">Utilization</th>
                    <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-robur-steel/60">Condition</th>
                    <th className="px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-robur-steel/60">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bins.map(bin => {
                    const cfg = statusConfig[bin.status] || statusConfig.at_depot;
                    const condPct = bin.condition_pct ?? 100;
                    const condColor = condPct < 40 ? 'text-red-500' : condPct < 70 ? 'text-orange-500' : 'text-emerald-500';
                    return (
                      <tr key={bin.id} className="border-b border-robur-light/15 hover:bg-robur-charcoal/[0.02] transition-colors">
                        <td className="px-3 py-2.5 text-xs font-bold text-robur-charcoal">{bin.bin_id}</td>
                        <td className="px-3 py-2.5 text-xs text-robur-steel">{bin.type} · {bin.size}</td>
                        <td className="px-3 py-2.5 text-xs text-robur-steel">{bin.client || '—'}</td>
                        <td className="px-3 py-2.5 text-xs text-robur-steel max-w-[120px] truncate">{bin.site_address || '—'}</td>
                        <td className="px-3 py-2.5 text-xs text-robur-steel text-right">{bin.days_on_site || 0}</td>
                        <td className="px-3 py-2.5 text-xs text-robur-steel text-right">{bin.utilization_pct || 0}%</td>
                        <td className={cn("px-3 py-2.5 text-xs font-bold text-right", condColor)}>{condPct}%</td>
                        <td className="px-3 py-2.5 text-center">
                          <Select value={bin.status} onValueChange={val => handleStatusChange(bin, val)}>
                            <SelectTrigger className={cn("w-full text-[10px] border-0 cursor-pointer h-7", cfg.color)}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="placed">Placed</SelectItem>
                              <SelectItem value="in_transit">In Transit</SelectItem>
                              <SelectItem value="at_depot">At Depot</SelectItem>
                              <SelectItem value="maintenance">Maintenance</SelectItem>
                              <SelectItem value="retired">Retired</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      </motion.div>
    </div>
  );
}