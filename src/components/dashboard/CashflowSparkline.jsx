import GlassCard from "@/components/ui/GlassCard";
import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";
import { TrendingUp } from "lucide-react";

const defaultData = [
  { v: 42 }, { v: 38 }, { v: 55 }, { v: 48 },
  { v: 62 }, { v: 58 }, { v: 71 }, { v: 65 },
  { v: 78 }, { v: 82 },
];

export default function CashflowSparkline({
  data = defaultData,
  label = "Cash Flow",
  value = "$128K",
  change = "+12.3%",
}) {
  return (
    <GlassCard level={2} className="p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-robur-yellow" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-robur-steel">
            {label}
          </h3>
        </div>
        <div className="text-right">
          <span className="text-lg font-bold text-robur-charcoal">{value}</span>
          <span className="ml-2 text-xs font-medium text-emerald-500">{change}</span>
        </div>
      </div>
      <div className="h-24">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="cashFlowGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FFC400" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#FFC400" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="v"
              stroke="#FFC400"
              strokeWidth={2}
              fill="url(#cashFlowGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
}