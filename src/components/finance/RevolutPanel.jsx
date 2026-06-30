import { useState, useEffect } from "react";
import { Loader, DollarSign, AlertCircle, CheckCircle2 } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import { base44 } from "@/api/base44Client";

export default function RevolutPanel() {
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await base44.functions.invoke("revolutBalance", {});
      if (response?.data?.balance !== undefined) {
        setConnected(true);
        setData(response.data);
      }
    } catch (err) {
      setConnected(false);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => {
    // Redirect to OAuth callback function with authorization request
    const clientId = import.meta.env.VITE_REVOLUT_CLIENT_ID || "your-client-id";
    const redirectUri = encodeURIComponent(
      `${window.location.origin}/api/functions/revolutOAuthCallback`
    );
    const authUrl = `https://merchant.revolut.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=read`;
    window.location.href = authUrl;
  };

  if (loading) {
    return (
      <GlassCard level={2} className="p-6">
        <div className="flex items-center justify-center h-40">
          <Loader className="h-6 w-6 text-robur-yellow animate-spin" />
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard level={2} className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-robur-charcoal flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-robur-yellow" />
            Revolut Business
          </h3>
          <p className="text-xs text-robur-steel/60 mt-1">Real-time cash flow sync</p>
        </div>
        {connected && <CheckCircle2 className="h-5 w-5 text-green-500" />}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 flex gap-2">
          <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      {connected && data ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-robur-steel/60 uppercase tracking-tight">Balance</p>
              <p className="text-lg font-bold text-robur-charcoal">
                {data.currency} {data.balance?.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-robur-steel/60 uppercase tracking-tight">Accounts</p>
              <p className="text-lg font-bold text-robur-charcoal">{data.accounts?.length || 0}</p>
            </div>
          </div>

          {data.recent_transactions?.length > 0 && (
            <div className="border-t border-robur-light/30 pt-3">
              <p className="text-[10px] text-robur-steel/60 uppercase tracking-tight mb-2">Recent</p>
              <div className="space-y-2">
                {data.recent_transactions.slice(0, 3).map((tx) => (
                  <div key={tx.id} className="flex justify-between items-start text-xs">
                    <span className="text-robur-steel truncate">{tx.description}</span>
                    <span className={tx.type === 'receive' ? 'text-green-600 font-semibold' : 'text-robur-charcoal'}>
                      {tx.type === 'receive' ? '+' : ''}{tx.currency} {tx.amount}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.xero && (
            <div className="border-t border-robur-light/30 pt-3">
              <p className="text-[10px] text-robur-steel/60 uppercase tracking-tight mb-2">Xero Sync</p>
              <div className="flex justify-between text-xs">
                <span className="text-robur-steel">Invoices: {data.xero.invoices_synced}/{data.xero.invoices_total}</span>
                <span className="text-robur-steel">Bills: {data.xero.bills_synced}/{data.xero.bills_total}</span>
              </div>
            </div>
          )}

          <button
            onClick={checkConnection}
            className="w-full py-2 px-3 rounded-lg bg-robur-yellow/10 hover:bg-robur-yellow/20 text-robur-yellow text-xs font-semibold transition-colors"
          >
            Refresh
          </button>
        </div>
      ) : (
        <div className="text-center py-6">
          <p className="text-xs text-robur-steel mb-4">Connect your Revolut Business account to sync transactions</p>
          <button
            onClick={handleConnect}
            className="w-full py-2 px-4 rounded-lg bg-robur-yellow text-robur-charcoal text-xs font-bold hover:bg-robur-yellow/90 transition-colors"
          >
            Connect Revolut
          </button>
        </div>
      )}
    </GlassCard>
  );
}