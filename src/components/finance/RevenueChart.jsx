import GlassCard from "@/components/ui/GlassCard";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const defaultData = [
  { month: "—", revenue: 0, margin: 0 },
  { month: "—", revenue: 0, margin: 0 },
  { month: "—", revenue: 0, margin: 0 },
  { month: "—", revenue: 0, margin: 0 },
  { month: "—", revenue: 0, margin: 0 },
  { month: "—", revenue: 0, margin: 0 },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <GlassCard level={4} className="px-3 py-2">
      <p className="text-[10px] font-medium text-robur-steel mb-1">{label} 2026</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="text-xs font-semibold text-robur-charcoal">
          {p.dataKey === "revenue" ? "Revenue" : "Margin"}: ${(p.value / 1000).toFixed(0)}K
        </p>
      ))}
    </GlassCard>
  );
};

export default function RevenueChart({ data, ytdRevenue }) {
  const chartData = data?.length ? data : defaultData;
  const ytd = ytdRevenue || 0;
  return (
    <GlassCard level={2} className="p-5">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-robur-steel">Revenue & Margin</h3>
          <p className="text-2xl font-bold text-robur-charcoal mt-1">${(ytd / 1000).toFixed(0)}K <span className="text-sm font-medium text-robur-steel">YTD</span></p>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-[10px] font-medium text-robur-steel">
            <span className="h-2 w-2 rounded-full bg-robur-yellow" /> Revenue
          </span>
          <span className="flex items-center gap-1.5 text-[10px] font-medium text-robur-steel">
            <span className="h-2 w-2 rounded-full bg-robur-charcoal" /> Margin
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#FFC400" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#FFC400" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="marginGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22262B" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#22262B" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#C9CCD4" strokeOpacity={0.3} vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#5E6770" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "#5E6770" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v / 1000}K`} />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey="revenue" stroke="#FFC400" strokeWidth={2} fill="url(#revenueGrad)" />
          <Area type="monotone" dataKey="margin" stroke="#22262B" strokeWidth={1.5} fill="url(#marginGrad)" />
        </AreaChart>
      </ResponsiveContainer>
    </GlassCard>
  );
}