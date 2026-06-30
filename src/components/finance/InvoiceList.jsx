import { useState, useEffect } from "react";
import GlassCard from "@/components/ui/GlassCard";
import StatusDot from "@/components/ui/StatusDot";
import { FileText, ChevronRight, RefreshCw, CheckCircle, Clock, AlertCircle, CreditCard } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { createCheckoutSession } from "@/functions/createCheckoutSession";

const statusConfig = {
  draft: { type: "idle", label: "Draft" },
  sent: { type: "active", label: "Sent" },
  paid: { type: "active", label: "Paid" },
  overdue: { type: "warning", label: "Overdue" },
};

export default function InvoiceList() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    base44.entities.Invoice.list('-created_date', 20)
      .then(setInvoices)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const totalOutstanding = invoices
    .filter(i => i.status === 'sent' || i.status === 'overdue')
    .reduce((sum, i) => sum + (i.total || 0), 0);

  const [payingId, setPayingId] = useState(null);

  const handlePay = async (invoiceId) => {
    setPayingId(invoiceId);
    try {
      const res = await createCheckoutSession({ invoice_id: invoiceId });
      if (res.data?.url) {
        window.location.href = res.data.url;
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPayingId(null);
    }
  };

  return (
    <GlassCard level={2} className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-robur-steel">Auto-Generated Invoices</h3>
          <p className="text-sm font-bold text-robur-charcoal mt-0.5">
            ${totalOutstanding.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-xs font-medium text-robur-steel">outstanding</span>
          </p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 rounded-lg bg-robur-charcoal/5 px-2.5 py-1.5 text-xs font-medium text-robur-steel hover:bg-robur-charcoal/10 transition-colors">
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} strokeWidth={2} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-14 rounded-xl bg-robur-charcoal/[0.03] animate-pulse" />
          ))}
        </div>
      ) : invoices.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <FileText className="h-8 w-8 text-robur-steel/30" strokeWidth={1.5} />
          <p className="text-xs text-robur-steel/60">No invoices yet — they auto-generate when dockets are validated.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {invoices.map((inv) => {
            const cfg = statusConfig[inv.status] || statusConfig.draft;
            return (
              <div key={inv.id} className="group flex items-center gap-3 rounded-xl p-2.5 hover:bg-robur-charcoal/[0.03] transition-colors cursor-pointer">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-robur-charcoal/5">
                  <FileText className="h-4 w-4 text-robur-steel" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-robur-charcoal">{inv.client}</span>
                    <StatusDot type={cfg.type} label={cfg.label} />
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-robur-steel/50">{inv.invoice_no}</span>
                    <span className="text-[10px] text-robur-steel/30">·</span>
                    <span className="text-[10px] text-robur-steel/50">{inv.docket_nos ? `${inv.docket_nos.split(',').length} docket(s)` : '—'}</span>
                  </div>
                </div>
                <span className="text-sm font-bold text-robur-charcoal">${(inv.total || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                {(inv.status === 'sent' || inv.status === 'overdue' || inv.status === 'draft') && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handlePay(inv.id); }}
                    disabled={payingId === inv.id}
                    className="flex items-center gap-1 rounded-lg bg-robur-yellow px-2.5 py-1.5 text-[10px] font-bold text-robur-charcoal hover:bg-robur-yellow/90 transition-colors disabled:opacity-50"
                  >
                    <CreditCard className="h-3 w-3" strokeWidth={2} />
                    {payingId === inv.id ? '...' : 'Pay'}
                  </button>
                )}
                <ChevronRight className="h-4 w-4 text-robur-light opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            );
          })}
        </div>
      )}
    </GlassCard>
  );
}