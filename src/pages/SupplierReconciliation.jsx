import { useState, useEffect } from "react";
import TopBar from "@/components/layout/TopBar";
import GlassCard from "@/components/ui/GlassCard";
import MetricCard from "@/components/ui/MetricCard";
import { motion } from "framer-motion";
import { FileSearch, CheckCircle, AlertTriangle, DollarSign, RefreshCw, Plus } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { reconcileSupplierInvoices } from "@/functions/reconcileSupplierInvoices";
import { cn } from "@/lib/utils";

const fadeIn = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

const statusConfig = {
  pending: 'bg-robur-charcoal/5 text-robur-steel',
  matched: 'bg-emerald-50 text-emerald-600',
  discrepancy: 'bg-red-50 text-red-500',
  approved: 'bg-blue-50 text-blue-600',
  rejected: 'bg-red-50 text-red-500',
};

export default function SupplierReconciliation() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reconciling, setReconciling] = useState(false);
  const [result, setResult] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ invoice_no: '', supplier: '', material: '', weight_charged: 0, rate: 0, total: 0, charge_type: 'Tip Fee' });

  const load = () => {
    setLoading(true);
    base44.entities.SupplierInvoice.list('-created_date', 50)
      .then(setInvoices)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleReconcile = async () => {
    setReconciling(true);
    try {
      const res = await reconcileSupplierInvoices({});
      setResult(res.data);
      load();
    } catch (err) { console.error(err); }
    finally { setReconciling(false); }
  };

  const handleCreate = async () => {
    if (!form.invoice_no || !form.supplier) return;
    try {
      await base44.entities.SupplierInvoice.create({
        ...form,
        date: new Date().toISOString().split('T')[0],
        status: 'pending',
      });
      setForm({ invoice_no: '', supplier: '', material: '', weight_charged: 0, rate: 0, total: 0, charge_type: 'Tip Fee' });
      setShowForm(false);
      load();
    } catch (err) { console.error(err); }
  };

  const stats = {
    total: invoices.length,
    matched: invoices.filter(i => i.status === 'matched').length,
    discrepancies: invoices.filter(i => i.status === 'discrepancy').length,
    totalValue: invoices.reduce((s, i) => s + (i.total || 0), 0),
  };

  return (
    <div className="max-w-7xl mx-auto">
      <TopBar title="Supplier Reconciliation" subtitle="Auto-match supplier charges against docket records" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <motion.div {...fadeIn} transition={{ delay: 0 }}>
          <MetricCard label="Supplier Invoices" value={loading ? '—' : stats.total} change="Total received" changeType="up" icon={FileSearch} />
        </motion.div>
        <motion.div {...fadeIn} transition={{ delay: 0.05 }}>
          <MetricCard label="Matched" value={loading ? '—' : stats.matched} change="Auto-reconciled" changeType="up" icon={CheckCircle} />
        </motion.div>
        <motion.div {...fadeIn} transition={{ delay: 0.1 }}>
          <MetricCard label="Discrepancies" value={loading ? '—' : stats.discrepancies} change="Need review" changeType={stats.discrepancies > 0 ? 'down' : 'up'} icon={AlertTriangle} />
        </motion.div>
        <motion.div {...fadeIn} transition={{ delay: 0.15 }}>
          <MetricCard label="Total Value" value={loading ? '—' : `$${stats.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} change="Supplier charges" changeType="up" icon={DollarSign} />
        </motion.div>
      </div>

      {result && (
        <motion.div {...fadeIn} transition={{ delay: 0.18 }}>
          <GlassCard level={2} className="p-4 mb-5 border-l-4 border-l-robur-yellow">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-500" strokeWidth={2} />
              <p className="text-xs font-bold text-robur-charcoal">
                Reconciliation complete: {result.matched} matched, {result.discrepancies} discrepancies out of {result.total_processed} invoices.
              </p>
            </div>
          </GlassCard>
        </motion.div>
      )}

      <motion.div {...fadeIn} transition={{ delay: 0.2 }}>
        <GlassCard level={2} className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-robur-steel">Supplier Invoices</h3>
            <div className="flex items-center gap-2">
              <button onClick={handleReconcile} disabled={reconciling} className="flex items-center gap-1.5 rounded-lg bg-robur-yellow px-3 py-1.5 text-xs font-bold text-robur-charcoal hover:bg-robur-yellow/90 transition-colors disabled:opacity-50">
                <RefreshCw className={cn("h-3 w-3", reconciling && "animate-spin")} strokeWidth={2} />
                {reconciling ? 'Reconciling...' : 'Auto-Reconcile'}
              </button>
              <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 rounded-lg bg-robur-charcoal/5 px-3 py-1.5 text-xs font-bold text-robur-steel hover:bg-robur-charcoal/10 transition-colors">
                <Plus className="h-3 w-3" strokeWidth={2.5} /> Add
              </button>
            </div>
          </div>

          {showForm && (
            <div className="mb-4 grid grid-cols-2 lg:grid-cols-7 gap-2 rounded-xl bg-robur-charcoal/[0.03] p-3">
              <input placeholder="Invoice No" value={form.invoice_no} onChange={e => setForm(f => ({ ...f, invoice_no: e.target.value }))} className="rounded-lg border border-robur-light/40 bg-white px-2 py-1.5 text-xs" />
              <input placeholder="Supplier" value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} className="rounded-lg border border-robur-light/40 bg-white px-2 py-1.5 text-xs" />
              <input placeholder="Material" value={form.material} onChange={e => setForm(f => ({ ...f, material: e.target.value }))} className="rounded-lg border border-robur-light/40 bg-white px-2 py-1.5 text-xs" />
              <input type="number" placeholder="Weight" value={form.weight_charged || ''} onChange={e => setForm(f => ({ ...f, weight_charged: Number(e.target.value) }))} className="rounded-lg border border-robur-light/40 bg-white px-2 py-1.5 text-xs" />
              <input type="number" placeholder="Rate" value={form.rate || ''} onChange={e => setForm(f => ({ ...f, rate: Number(e.target.value) }))} className="rounded-lg border border-robur-light/40 bg-white px-2 py-1.5 text-xs" />
              <input type="number" placeholder="Total" value={form.total || ''} onChange={e => setForm(f => ({ ...f, total: Number(e.target.value) }))} className="rounded-lg border border-robur-light/40 bg-white px-2 py-1.5 text-xs" />
              <button onClick={handleCreate} className="rounded-lg bg-robur-charcoal px-2 py-1.5 text-xs font-bold text-white">Create</button>
            </div>
          )}

          {loading ? (
            <div className="space-y-2">{[1, 2, 3, 4].map(i => <div key={i} className="h-14 rounded-xl bg-robur-charcoal/[0.03] animate-pulse" />)}</div>
          ) : invoices.length === 0 ? (
            <p className="text-xs text-robur-steel/60 py-8 text-center">No supplier invoices yet. Add supplier charges and run auto-reconciliation to match against dockets.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-robur-light/30">
                    <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-robur-steel/60">Invoice No</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-robur-steel/60">Supplier</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-robur-steel/60">Material</th>
                    <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-robur-steel/60">Weight</th>
                    <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-robur-steel/60">Total</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-robur-steel/60">Matched Dockets</th>
                    <th className="px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-robur-steel/60">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(si => (
                    <tr key={si.id} className="border-b border-robur-light/15 hover:bg-robur-charcoal/[0.02] transition-colors">
                      <td className="px-3 py-2.5 text-xs font-bold text-robur-charcoal">{si.invoice_no}</td>
                      <td className="px-3 py-2.5 text-xs text-robur-steel">{si.supplier}</td>
                      <td className="px-3 py-2.5 text-xs text-robur-steel">{si.material || '—'}</td>
                      <td className="px-3 py-2.5 text-xs text-robur-steel text-right">{si.weight_charged ? `${si.weight_charged}t` : '—'}</td>
                      <td className="px-3 py-2.5 text-xs font-semibold text-robur-charcoal text-right">${(si.total || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                      <td className="px-3 py-2.5 text-xs text-robur-steel max-w-[140px] truncate">{si.matched_docket_nos || '—'}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={cn("inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold", statusConfig[si.status] || statusConfig.pending)}>
                          {si.status}
                        </span>
                        {si.discrepancy_notes && (
                          <p className="text-[9px] text-red-400 mt-0.5 max-w-[120px] mx-auto truncate" title={si.discrepancy_notes}>{si.discrepancy_notes}</p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      </motion.div>
    </div>
  );
}