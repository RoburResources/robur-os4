import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  AlertTriangle, Info, CheckCircle2, Wrench, Truck, Fuel,
  Calendar, ArrowRight, Link as LinkIcon, Zap
} from "lucide-react";

/**
 * AlertCard — semantic alert storytelling.
 * Instead of a flat text feed, each card tells a story:
 *   [What happened] → [Why it matters] → [What the system did about it]
 * Links the alert reason directly to system remediation.
 */

const severityConfig = {
  critical: { icon: AlertTriangle, color: "text-red-500", bg: "bg-red-50", border: "border-red-200", accent: "bg-red-500" },
  warning:  { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", accent: "bg-amber-400" },
  info:     { icon: Info, color: "text-sky-500", bg: "bg-sky-50", border: "border-sky-200", accent: "bg-sky-400" },
  success:  { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50", border: "border-emerald-200", accent: "bg-emerald-400" },
};

const remediationIcons = {
  maintenance: Wrench,
  dispatched: Truck,
  fuel: Fuel,
  service: Calendar,
};

export default function AlertCard({ alert, onAction }) {
  const cfg = severityConfig[alert.severity] || severityConfig.info;
  const Icon = cfg.icon;
  const RemIcon = alert.remediation ? (remediationIcons[alert.remediation.type] || LinkIcon) : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={cn("rounded-xl border overflow-hidden", cfg.border, cfg.bg)}
    >
      {/* Story header: what happened */}
      <div className="flex items-start gap-2.5 p-3">
        <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", cfg.bg, "ring-1", cfg.border)}>
          <Icon className={cn("h-3.5 w-3.5", cfg.color)} strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-robur-charcoal leading-tight">{alert.message}</p>
          <p className="text-[10px] text-robur-steel mt-0.5">{alert.detail || alert.time}</p>
        </div>
        <span className={cn("h-1.5 w-1.5 rounded-full shrink-0 mt-1.5", cfg.accent)} />
      </div>

      {/* Remediation: what the system did */}
      {alert.remediation && (
        <div className="border-t border-robur-light/20 bg-white/50 px-3 py-2">
          <div className="flex items-center gap-2">
            {RemIcon && <RemIcon className="h-3 w-3 text-robur-steel" strokeWidth={2} />}
            <span className="text-[10px] font-medium text-robur-steel flex-1">{alert.remediation.text}</span>
            {alert.remediation.link && (
              <button
                onClick={() => onAction?.(alert.remediation.link)}
                className="flex items-center gap-0.5 text-[10px] font-bold text-robur-charcoal hover:text-robur-yellow transition-colors"
              >
                View <ArrowRight className="h-2.5 w-2.5" strokeWidth={2.5} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Quick Action: one-click resolve — executes inline without navigating away */}
      {alert.quickAction && (
        <div className="border-t border-robur-light/20 px-3 py-2">
          <button
            onClick={() => alert.quickAction.onResolve?.(alert)}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-robur-charcoal px-3 py-1.5 text-[10px] font-bold text-white hover:bg-robur-charcoal/90 active:scale-95 transition-all"
          >
            <Zap className="h-3 w-3" strokeWidth={2.5} />
            {alert.quickAction.label}
          </button>
        </div>
      )}
    </motion.div>
  );
}