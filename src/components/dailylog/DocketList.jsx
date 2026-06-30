import GlassCard from "@/components/ui/GlassCard";
import { FileStack } from "lucide-react";

export default function DocketList({ dockets, loading }) {
  return (
    <GlassCard level={2} className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <FileStack className="h-4 w-4 text-robur-yellow" />
        <h3 className="text-sm font-semibold text-robur-charcoal">Finished Dockets</h3>
        {!loading && (
          <span className="ml-auto text-[10px] font-medium text-robur-steel">{dockets.length} records</span>
        )}
      </div>

      {loading ? (
        <p className="text-xs text-robur-steel text-center py-8">Loading dockets...</p>
      ) : dockets.length === 0 ? (
        <div className="text-center py-10">
          <FileStack className="h-8 w-8 text-robur-light mx-auto mb-2" />
          <p className="text-xs text-robur-steel">No finished dockets for this shift</p>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-robur-light/20">
                <th className="px-1 pb-2 text-[10px] font-semibold uppercase tracking-wider text-robur-steel">Docket</th>
                <th className="px-1 pb-2 text-[10px] font-semibold uppercase tracking-wider text-robur-steel">Material</th>
                <th className="px-1 pb-2 text-[10px] font-semibold uppercase tracking-wider text-robur-steel">Site</th>
                <th className="px-1 pb-2 text-[10px] font-semibold uppercase tracking-wider text-robur-steel text-right">Net</th>
                <th className="px-1 pb-2 text-[10px] font-semibold uppercase tracking-wider text-robur-steel text-right">Time</th>
              </tr>
            </thead>
            <tbody>
              {dockets.map((d, i) => (
                <tr key={d.id || i} className="border-b border-robur-light/10 last:border-0 hover:bg-robur-charcoal/[0.02]">
                  <td className="px-1 py-2.5 text-[11px] font-bold text-robur-charcoal">{d.docket_no || "—"}</td>
                  <td className="px-1 py-2.5 text-[11px] text-robur-steel">{d.material || "—"}</td>
                  <td className="px-1 py-2.5 text-[11px] text-robur-steel max-w-[120px] truncate">{d.site || "—"}</td>
                  <td className="px-1 py-2.5 text-[11px] font-semibold text-robur-charcoal text-right">
                    {d.net_weight ? `${d.net_weight >= 1000 ? (d.net_weight / 1000).toFixed(1) + "t" : d.net_weight + "kg"}` : "—"}
                  </td>
                  <td className="px-1 py-2.5 text-[10px] text-robur-steel text-right whitespace-nowrap">
                    {d.time_in || "—"} → {d.time_out || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-robur-light/30">
                <td colSpan={3} className="px-1 pt-3 text-[11px] font-bold text-robur-charcoal">Totals</td>
                <td className="px-1 pt-3 text-[11px] font-bold text-robur-charcoal text-right">
                  {(() => {
                    const total = dockets.reduce((s, d) => s + (d.net_weight || 0), 0);
                    return total >= 1000 ? (total / 1000).toFixed(1) + "t" : total + "kg";
                  })()}
                </td>
                <td className="px-1 pt-3 text-[10px] text-robur-steel text-right">{dockets.length} dockets</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </GlassCard>
  );
}