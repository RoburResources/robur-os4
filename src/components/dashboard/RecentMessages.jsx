import GlassCard from "@/components/ui/GlassCard";
import { MessageSquare } from "lucide-react";

export default function RecentMessages() {
  const messages = [];

  return (
    <GlassCard level={2} className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-robur-steel">Messages</h3>
        {messages.length > 0 && (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-robur-yellow text-[10px] font-bold text-robur-charcoal">
            {messages.length}
          </div>
        )}
      </div>

      {messages.length === 0 ? (
        <p className="text-xs text-robur-steel/60 text-center py-4">No messages</p>
      ) : (
        <div className="space-y-2">
          {messages.map((msg, i) => (
            <div
              key={i}
              className="group flex items-start gap-3 rounded-xl p-2.5 hover:bg-robur-charcoal/[0.03] transition-colors cursor-pointer"
            >
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${msg.color}`}>
                <span className="text-[10px] font-bold text-white">{msg.initials}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-robur-charcoal">{msg.from}</p>
                  <span className="text-[10px] text-robur-steel/50">{msg.time}</span>
                </div>
                <p className="text-xs text-robur-steel mt-0.5 line-clamp-2">{msg.text}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {messages.length > 0 && (
        <button className="mt-3 flex w-full items-center justify-center gap-1 rounded-xl py-2 text-xs font-medium text-robur-steel hover:bg-robur-charcoal/[0.03] transition-colors">
          <MessageSquare className="h-3 w-3" strokeWidth={1.5} />
          View All Messages
        </button>
      )}
    </GlassCard>
  );
}