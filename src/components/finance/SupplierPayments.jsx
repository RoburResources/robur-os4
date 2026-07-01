import { useState, useEffect } from "react";
import GlassCard from "@/components/ui/GlassCard";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { base44 } from "@/api/base44Client";

const colors = ["#FFC400", "#22262B", "#5E6770", "#C9CCD4", "#FFC400", "#5E6770"];

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-4 rounded-lg px-3 py-2">
      <p className="text-xs font-semibold text-robur-charcoal">
        {payload[0].payload.name}: ${(payload[0].value / 1000).toFixed(1)}K
      </p>
    </div>
  );
};

export default function SupplierPayments() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPayments() {
      try {
        const invoices = await base44.entities.SupplierInvoice.list();
        const byMaterial = {};
        invoices.forEach((inv) => {
          const key = inv.material || inv.charge_type || "Other";
          if (!byMaterial[key]) byMaterial[key] = 0;
          byMaterial[key] += inv.total || 0;
        });
        const chartData = Object.entries(byMaterial).map(([name, amount]) => ({ name, amount }));
        setData(chartData);
      } catch {}
      finally { setLoading(false); }
    }
    loadPayments();
  }, []);

  const total = data.reduce((s, d) => s + d.amount, 0);

  return (
    <GlassCard level={2} className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-robur-steel">Supplier Payments</h3>
          <p className="text-lg font-bold text-robur-charcoal mt-1">
            ${total.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-xs font-medium text-robur-steel">total</span>
          </p>
        </div>
      </div>
      {loading ? (
        <div className="h-[180px] rounded-xl bg-robur-charcoal/[0.03] animate-pulse" />
      ) : data.length === 0 ? (
        <p className="text-xs text-robur-steel/60 text-center py-8">No supplier payments recorded</p>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#C9CCD4" strokeOpacity={0.3} vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#5E6770" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#5E6770" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v / 1000}K`} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255, 196, 0, 0.05)" }} />
            <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
              {data.map((entry, i) => (
                <Cell key={i} fill={colors[i % colors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </GlassCard>
  );
}