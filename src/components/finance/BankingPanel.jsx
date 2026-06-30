import { useState, useEffect } from "react";
import GlassCard from "@/components/ui/GlassCard";
import { Wallet, TrendingUp, TrendingDown, CheckCircle2, RefreshCw } from "lucide-react";
import { revolutBalance } from "@/functions/revolutBalance";

export default function BankingPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await revolutBalance({});
      if (res.status === 200) {
        setData(res.data);
      } else {
        setError(res.data?.error || "Failed to load banking data");
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <GlassCard level={2} className="p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-robur-yellow" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-robur-steel">Live Banking</h3>
        </div>
        <button onClick={fetchData} className="text-robur-steel hover:text-robur-charcoal transition-colors">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-robur-light border-t-robur-charcoal rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="py-6 text-center">
          <p className="text-xs text-robur-steel/60">{error}</p>
          <p className="text-[10px] text-robur-steel/40 mt-1">Check Revolut API key in settings</p>
        </div>
      ) : data ? (
        <div className="space-y-4">
          {/* Balance */}
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-robur-steel/60">Revolut Balance</p>
            <p className="text-3xl font-bold tracking-tight text-robur-charcoal mt-1">
              {data.currency === "AUD" ? "$" : data.currency + " "}
              {(data.balance || 0).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            {data.accounts?.length > 1 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {data.accounts.map((a, i) => (
                  <span key={i} className="text-[10px] text-robur-steel bg-robur-charcoal/5 rounded-md px-2 py-0.5">
                    {a.name}: {a.currency === "AUD" ? "$" : a.currency + " "}{(a.balance || 0).toLocaleString("en-AU", { minimumFractionDigits: 2 })}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Xero sync status */}
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-[11px] font-medium text-emerald-700">
              Xero: {data.xero?.invoices_synced || 0}/{data.xero?.invoices_total || 0} invoices · {data.xero?.bills_synced || 0}/{data.xero?.bills_total || 0} bills synced
            </span>
          </div>

          {/* Recent transactions */}
          {data.recent_transactions?.length > 0 && (
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-robur-steel/60 mb-2">Recent Transactions</p>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {data.recent_transactions.map((tx, i) => {
                  const isIncoming = parseFloat(tx.amount) > 0;
                  return (
                    <div key={i} className="flex items-center justify-between rounded-lg bg-robur-charcoal/[0.03] px-3 py-1.5">
                      <div className="flex items-center gap-2">
                        {isIncoming ? (
                          <TrendingUp className="h-3 w-3 text-emerald-500" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-red-400" />
                        )}
                        <span className="text-[11px] text-robur-charcoal truncate max-w-[140px]">{tx.description}</span>
                      </div>
                      <span className={`text-[11px] font-semibold ${isIncoming ? "text-emerald-600" : "text-red-500"}`}>
                        {isIncoming ? "+" : "-"}${Math.abs(parseFloat(tx.amount)).toLocaleString("en-AU", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </GlassCard>
  );
}