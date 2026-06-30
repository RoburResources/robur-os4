import TopBar from "@/components/layout/TopBar";
import MetricCard from "@/components/ui/MetricCard";
import RevenueChart from "@/components/finance/RevenueChart";
import InvoiceList from "@/components/finance/InvoiceList";
import SupplierPayments from "@/components/finance/SupplierPayments";
import DynamicPricingPanel from "@/components/finance/DynamicPricingPanel";
import WorkflowFlow from "@/components/ui/WorkflowFlow";
import { motion } from "framer-motion";
import { DollarSign, TrendingUp, Clock, CreditCard } from "lucide-react";
import { Link } from "react-router-dom";

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

export default function Finance() {
  return (
    <div className="max-w-7xl mx-auto">
      <TopBar title="Payment Management" subtitle="Financial overview · June 2026" />
      <WorkflowFlow steps={["Invoice", "Submit", "Review", "Pay", "Reconcile", "End"]} currentStep={2} />

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <motion.div {...fadeIn} transition={{ delay: 0 }}>
          <MetricCard label="Monthly Revenue" value="$392K" change="↑ 7.4% vs May" changeType="up" icon={DollarSign} />
        </motion.div>
        <motion.div {...fadeIn} transition={{ delay: 0.05 }}>
          <MetricCard label="Gross Margin" value="31.9%" change="↑ 1.2pp" changeType="up" icon={TrendingUp} />
        </motion.div>
        <motion.div {...fadeIn} transition={{ delay: 0.1 }}>
          <MetricCard label="Outstanding" value="$37.5K" change="3 invoices overdue" changeType="down" icon={Clock} />
        </motion.div>
        <motion.div {...fadeIn} transition={{ delay: 0.15 }}>
          <MetricCard label="DSO" value="28 days" change="↓ 4 days vs Q1" changeType="up" icon={CreditCard} />
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

        {/* Dynamic Pricing Engine */}
        <motion.div className="col-span-12 lg:col-span-5" {...fadeIn} transition={{ delay: 0.35 }}>
          <DynamicPricingPanel />
        </motion.div>

        {/* Quick links to margin analysis & reconciliation */}
        <motion.div className="col-span-12 lg:col-span-7" {...fadeIn} transition={{ delay: 0.4 }}>
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