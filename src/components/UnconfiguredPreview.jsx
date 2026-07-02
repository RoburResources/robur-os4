import React from "react";
import { Settings, Lock } from "lucide-react";

export default function UnconfiguredPreview() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-robur-yellow mb-5 glow-yellow">
            <Lock className="h-8 w-8 text-robur-charcoal" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-robur-charcoal">Robur Flow OS</h1>
          <p className="text-sm text-robur-steel mt-1">Preview not configured</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-7">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
              <Settings className="h-5 w-5 text-amber-500" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-sm font-semibold text-robur-charcoal">Setup required</p>
              <p className="text-xs text-robur-steel">Local production preview</p>
            </div>
          </div>

          <p className="text-sm text-robur-steel leading-relaxed mb-5">
            This local preview doesn't have its Base44 app environment values set, so
            authentication and data services are offline. Add the environment values
            and rebuild to bring the full system online.
          </p>

          <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
            <p className="text-[11px] font-medium uppercase tracking-wider text-robur-steel mb-2">
              .env.local
            </p>
            <pre className="text-xs text-robur-charcoal font-mono leading-relaxed whitespace-pre-wrap">
{`VITE_BASE44_APP_ID=your_app_id
VITE_BASE44_APP_BASE_URL=your_backend_url`}
            </pre>
          </div>
        </div>

        <p className="text-center text-xs text-robur-steel mt-6">
          Robur Flow OS · Operations Intelligence
        </p>
      </div>
    </div>
  );
}