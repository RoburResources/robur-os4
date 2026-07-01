import { useState, useEffect, useMemo } from "react";
import TopBar from "@/components/layout/TopBar";
import MetricCard from "@/components/ui/MetricCard";
import GlassCard from "@/components/ui/GlassCard";
import RevenueChart from "@/components/finance/RevenueChart";
import WhatNextPanel from "@/components/ui/WhatNextPanel";
import AlertCard from "@/components/ui/AlertCard";
import { motion } from "framer-motion";
import { DollarSign, Truck, Package, CheckCircle, ArrowRight, TrendingUp, AlertTriangle, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { getExecutiveData } from "@/functions/getExecutiveData";
import { base44 } from "@/api/base44Client";
import SmartLookbackPanel from "@/components/ui/SmartLookbackPanel";
import ClientChurnPanel from "@/components/staff/ClientChurnPanel";
import BankingPanel from "@/components/finance/BankingPanel";

const fadeIn = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

export default function ExecutiveDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [roleView, setRoleView] = useState("admin");

  const handleQuickResolve = async (alert) => {
    const action = alert.quickAction;
    if (action?.type === "assign_backup") {
      // Find an idle vehicle and assign it to the affected job
      try {
        const idleVehicles = await base44.entities.Vehicle.filter({ status: "idle" });
        if (idleVehicles.length > 0 && alert.jobId) {
          await base44.entities.Job.update(alert.jobId, { vehicle_id: idleVehicles[0].vehicle_id, status: "assigned" });
        }
      } catch {}
    } else if (action?.type === "message_client") {
      // Send a client notification via email
      try {
        if (alert.clientEmail) {
          await base44.integrations.Core.SendEmail({
            to: alert.clientEmail,
            subject: `Update on your job — ${alert.message}`,
            body: `We're aware of the issue and are actively resolving it. ${alert.detail || ""}`,
          });
        }
      } catch {}
    }
  };

  useEffect(() => {
    getExecutiveData({})
      .then((res) => {
        if (res.status === 403) { setForbidden(true); return; }
        setData(res.data);
      })
      .catch((err) => {
        if (err?.response?.status === 403) setForbidden(true);
      })
      .finally(() => setLoading(false));
  }, []);

  const metrics = data?.metrics;
  const alerts = data?.alerts || [];
  const activity = data?.activity || [];

  if (forbidden) {
    return (
      <div className="max-w-7xl mx-auto flex flex-col items-center justify-center" style={{ minHeight: "60vh" }}>
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 mb-4">
          <Lock className="h-8 w-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-robur-charcoal mb-2">Access Restricted</h2>
        <p className="text-sm text-robur-steel text-center max-w-sm">
          The Executive Dashboard is only available to administrators. Contact your administrator if you believe this is an error.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <TopBar title="Executive Dashboard" subtitle="Strategic overview" />

      {/* Role-based view toggle */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-robur-steel">View:</span>
        {[
          { key: "admin", label: "All" },
          { key: "fleet", label: "Fleet" },
          { key: "finance", label: "Finance" },
        ].map((r) => (
          <button
            key={r.key}
            onClick={() => setRoleView(r.key)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-[11px] font-bold transition-colors",
              roleView === r.key
                ? "bg-robur-charcoal text-white"
                : "bg-robur-charcoal/5 text-robur-steel hover:bg-robur-charcoal/10"
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {(roleView === "admin" || roleView === "finance") && (
          <motion.div {...fadeIn} transition={{ delay: 0 }}>
            <MetricCard label="Monthly Revenue" value={loading ? "—" : `$${Math.round((metrics?.monthlyRevenue ?? 0) / 1000)}K`} change={metrics?.revenueChange != null ? `${metrics.revenueChange >= 0 ? "↑" : "↓"} ${Math.abs(metrics.revenueChange)}% vs last month` : null} changeType={metrics?.revenueChange >= 0 ? "up" : "down"} icon={DollarSign} />
          </motion.div>
        )}
        {(roleView === "admin" || roleView === "fleet") && (
          <motion.div {...fadeIn} transition={{ delay: 0.05 }}>
            <MetricCard label="Fleet Utilisation" value={loading ? "—" : `${metrics?.fleetUtilisation ?? 0}%`} change={`${metrics?.activeVehicles ?? 0} of ${metrics?.totalVehicles ?? 0} active`} changeType="up" icon={Truck} />
          </motion.div>
        )}
        {(roleView === "admin" || roleView === "fleet") && (
          <motion.div {...fadeIn} transition={{ delay: 0.1 }}>
            <MetricCard label="Active Jobs" value={loading ? "—" : `${metrics?.activeJobs ?? 0}`} change={`${metrics?.completedThisMonth ?? 0} completed this month`} changeType="up" icon={Package} />
          </motion.div>
        )}
        {(roleView === "admin" || roleView === "fleet") && (
          <motion.div {...fadeIn} transition={{ delay: 0.15 }}>
            <MetricCard label="On-Time Rate" value={loading ? "—" : `${metrics?.onTimeRate ?? 0}%`} change="vs target 90%" changeType="up" icon={CheckCircle} />
          </motion.div>
        )}
      </div>

      {/* What's Next — predictive 30-minute lookahead */}
      <div className="grid grid-cols-12 gap-5 mb-5">
        <motion.div className="col-span-12 lg:col-span-5 h-full" {...fadeIn} transition={{ delay: 0.15 }}>
          <WhatNextPanel />
        </motion.div>
        <motion.div className="col-span-12 lg:col-span-7" {...fadeIn} transition={{ delay: 0.2 }}>
          <RevenueChart data={metrics?.monthlySeries} ytdRevenue={metrics?.ytdRevenue} />
        </motion.div>
      </div>

      <div className="grid grid-cols-12 gap-5">
        <motion.div className="col-span-12 lg:col-span-5" {...fadeIn} transition={{ delay: 0.25 }}>
          <GlassCard level={2} className="p-5 h-full">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-4 w-4 text-robur-yellow" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-robur-steel">Priority Alerts</h3>
            </div>
            <div className="space-y-2">
              {alerts.length === 0 ? (
                <p className="text-xs text-robur-steel/60">No active alerts</p>
              ) : (
                alerts.map((a, i) => (
                  <AlertCard
                    key={i}
                    alert={{
                      ...a,
                      detail: a.time,
                      remediation: a.severity === "critical" ? {
                        type: "maintenance",
                        text: "Maintenance job auto-created",
                        link: "/jobs",
                      } : a.severity === "warning" ? {
                        type: "fuel",
                        text: "Alert sent to operations channel",
                      } : null,
                      quickAction: a.severity === "critical" ? {
                        label: "Assign Backup Vehicle",
                        onResolve: () => handleQuickResolve(a),
                      } : a.severity === "warning" ? {
                        label: "Message Client",
                        onResolve: () => handleQuickResolve(a),
                      } : null,
                    }}
                  />
                ))
              )}
            </div>
          </GlassCard>
        </motion.div>

        <motion.div className="col-span-12 lg:col-span-7" {...fadeIn} transition={{ delay: 0.3 }}>
          <GlassCard level={2} className="p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-robur-steel mb-4">Recent Activity</h3>
            <div className="space-y-3">
              {activity.length === 0 ? (
                <p className="text-xs text-robur-steel/60">No recent activity</p>
              ) : (
                activity.map((a, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl bg-robur-charcoal/[0.03] p-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/60">
                      <TrendingUp className="h-4 w-4 text-robur-charcoal" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-robur-charcoal">{a.action}</p>
                      <p className="text-[10px] text-robur-steel">{a.detail}</p>
                    </div>
                    <span className="text-[10px] text-robur-steel/60">{a.time}</span>
                  </div>
                ))
              )}
            </div>
          </GlassCard>
        </motion.div>

        <motion.div className="col-span-12 lg:col-span-5" {...fadeIn} transition={{ delay: 0.35 }}>
          <SmartLookbackPanel />
        </motion.div>

        <motion.div className="col-span-12 lg:col-span-5" {...fadeIn} transition={{ delay: 0.45 }}>
          <ClientChurnPanel />
        </motion.div>

        <motion.div className="col-span-12 lg:col-span-7" {...fadeIn} transition={{ delay: 0.4 }}>
          <BankingPanel />
        </motion.div>
      </div>
    </div>
  );
}