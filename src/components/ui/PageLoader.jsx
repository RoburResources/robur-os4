import { Lock } from "lucide-react";

export default function PageLoader() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-robur-yellow glow-yellow">
          <Lock className="h-6 w-6 text-robur-charcoal" strokeWidth={2.5} />
        </div>
        <div className="w-8 h-8 border-2 border-robur-light border-t-robur-charcoal rounded-full animate-spin" />
      </div>
    </div>
  );
}