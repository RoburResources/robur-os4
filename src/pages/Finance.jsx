import { useState, useEffect } from "react";
import TopBar from "@/components/layout/TopBar";
import MetricCard from "@/components/ui/MetricCard";
import RevenueChart from "@/components/finance/RevenueChart";
import InvoiceList from "@/components/finance/InvoiceList";
import SupplierPayments from "@/components/finance/SupplierPayments";
import DynamicPricingPanel from "@/components/finance/DynamicPricingPanel";
import RevolutPanel from "@/components/finance/RevolutPanel";
import WorkflowFlow from "@/components/ui/WorkflowFlow";
import { motion } from "framer-motion";
import { DollarSign, TrendingUp, Clock, CreditCard } from "lucide-react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

export default function Finance() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMetrics() {
      try {
        const invoices = await base44.entities.Invoice.list();
        const outstanding = invoices
          .filter((i) => i.status === "sent" || i.status === "overdue")
          .reduce((sum, i) => sum + (i.total || 0), 0);
        const monthlyRevenue = invoices
          .filter((i) => i.status === "paid")
          .reduce((sum, i) => sum + (i.total || 0), 0);
        const overdueCount = invoices.filter((i) => i.status === "overdue").length;

        setMetrics({
          monthlyRevenue,
          outstanding,
          overdueCount,
          totalInvoices: invoices.length,
        });
      } catch {
        setMetrics(null);
      } finally {
        setLoading(false);
      }
    }
    loadMetrics();
  }, []);

  return (
    <div className="max-w-7xl mx-auto">
      <TopBar title="Payment Management" subtitle="Financial overview" />
      <WorkflowFlow steps={["Invoice", "Submit", "Review", "Pay", "Reconcile", "End"]} currentStep={2} />

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <motion.div {...fadeIn} transition={{ delay: 0 }}>
          <MetricCard label="Revenue (Paid)" value={loading ? "—" : `$${(metrics?.monthlyRevenue ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`} change={`${metrics?.totalInvoices ?? 0} invoices`} changeType="up" icon={DollarSign} />
        </motion.div>
        <motion.div {...fadeIn} transition={{ delay: 0.05 }}>
          <MetricCard label="Outstanding" value={loading ? "—" : `$${(metrics?.outstanding ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`} change="Awaiting payment" changeType="down" icon={Clock} />
        </motion.div>
        <motion.div {...fadeIn} transition={{ delay: 0.1 }}>
          <MetricCard label="Overdue" value={loading ? "—" : metrics?.overdueCount ?? 0} change="Invoices past due" changeType={metrics?.overdueCount > 0 ? "down" : "up"} icon={TrendingUp} />
        </motion.div>
        <motion.div {...fadeIn} transition={{ delay: 0.15 }}>
          <MetricCard label="Total Invoices" value={loading ? "—" : metrics?.totalInvoices ?? 0} change="All time" changeType="up" icon={CreditCard} />
        </motion.div>
      </div>

      {/* Charts & Lists */}
      <div className="grid grid-cols-12 gap-5">
        <motion.div className="col-span-12 lg:col-span-7" {...fadeIn} transition={{ delay: 0.2 }}>
          <RevenueChart />
        </motion.div>
        <motion.div className="col-span-12 lg:col-span-5" {...fadeIn} transition={{ delay: 0.25 }}>
          <SupplierPayments />
        </motion.div>
        <motion.div className="col-span-12" {...fadeIn} transition={{ delay: 0.3 }}>
          <InvoiceList />
        </motion.div>

        {/* Revolut & Dynamic Pricing */}
        <motion.div className="col-span-12 lg:col-span-5" {...fadeIn} transition={{ delay: 0.35 }}>
          <RevolutPanel />
        </motion.div>
        <motion.div className="col-span-12 lg:col-span-7" {...fadeIn} transition={{ delay: 0.35 }}>
          <DynamicPricingPanel />
        </motion.div>

        {/* Quick links to margin analysis & reconciliation */}
        <motion.div className="col-span-12 lg:col-span-5" {...fadeIn} transition={{ delay: 0.4 }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-full">
            <Link to="/margins" className="group rounded-2xl bg-gradient-to-br from-robur-charcoal to-robur-charcoal/80 p-5 hover:scale-[1.02] transition-transform">
              <TrendingUp className="h-6 w-6 text-robur-yellow mb-3" strokeWidth={1.5} />
              <h3 className="text-sm font-bold text-white">Material Margin Analysis</h3>
              <p className="text-[11px] text-robur-light/60 mt-1">Revenue vs disposal cost by material × site</p>
            </Link>
            <Link to="/reconciliation" className="group rounded-2xl bg-gradient-to-br from-robur-charcoal/90 to-robur-charcoal/70 p-5 hover:scale-[1.02] transition-transform">
              <CreditCard className="h-6 w-6 text-robur-yellow mb-3" strokeWidth={1.5} />
              <h3 className="text-sm font-bold text-white">Supplier Reconciliation</h3>
              <p className="text-[11px] text-robur-light/60 mt-1">Auto-match supplier charges to dockets</p>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}