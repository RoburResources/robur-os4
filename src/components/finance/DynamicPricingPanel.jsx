import { useState, useEffect } from "react";
import GlassCard from "@/components/ui/GlassCard";
import { Calculator, Zap, Clock, Mountain, CalendarDays, Save } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function DynamicPricingPanel() {
  const [rateCards, setRateCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [material, setMaterial] = useState('Mixed Soil');
  const [weight, setWeight] = useState(10);
  const [flags, setFlags] = useState({ rush: false, afterHours: false, difficultAccess: false, sameDay: false });

  useEffect(() => {
    base44.entities.RateCard.list()
      .then(setRateCards)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const card = rateCards.find(r => r.material === material);
  const baseRate = card?.base_rate_per_tonne || 85;
  const minCharge = card?.minimum_charge || 150;

  let multiplier = 1;
  if (flags.rush) multiplier *= card?.rush_multiplier || 1.5;
  if (flags.afterHours) multiplier *= card?.after_hours_multiplier || 1.25;
  if (flags.difficultAccess) multiplier *= card?.difficult_access_multiplier || 1.15;
  if (flags.sameDay) multiplier *= card?.same_day_multiplier || 1.3;

  const effectiveRate = baseRate * multiplier;
  const subtotal = Math.max(effectiveRate * weight, minCharge * multiplier);
  const gst = subtotal * 0.1;
  const total = subtotal + gst;

  const toggleFlag = (key) => setFlags(f => ({ ...f, [key]: !f[key] }));

  const flagConfig = [
    { key: 'rush', label: 'Rush Job', icon: Zap, desc: 'Priority dispatch' },
    { key: 'afterHours', label: 'After Hours', icon: Clock, desc: 'Outside 7am–5pm' },
    { key: 'difficultAccess', label: 'Difficult Access', icon: Mountain, desc: 'Tight/confined site' },
    { key: 'sameDay', label: 'Same-Day Booking', icon: CalendarDays, desc: 'Booked today' },
  ];

  return (
    <GlassCard level={2} className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <Calculator className="h-4 w-4 text-robur-yellow" strokeWidth={2} />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-robur-steel">Dynamic Pricing Engine</h3>
      </div>

      <div className="space-y-4">
        {/* Material selector */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-robur-steel mb-1">Material</label>
            <Select value={material} onValueChange={setMaterial}>
              <SelectTrigger className="w-full text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {loading ? (
                  <SelectItem value={material} disabled>Loading...</SelectItem>
                ) : rateCards.length === 0 ? (
                  <>
                    <SelectItem value="Mixed Soil">Mixed Soil</SelectItem>
                    <SelectItem value="Concrete">Concrete</SelectItem>
                    <SelectItem value="Green Waste">Green Waste</SelectItem>
                    <SelectItem value="General Waste">General Waste</SelectItem>
                  </>
                ) : (
                  rateCards.map(r => <SelectItem key={r.id} value={r.material}>{r.material}</SelectItem>)
                )}
              </SelectContent>
            </Select>
          </div>

        {/* Weight slider */}
        <div>
          <label className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-robur-steel mb-1">
            <span>Weight (tonnes)</span>
            <span className="text-robur-charcoal">{weight}t</span>
          </label>
          <input type="range" min="1" max="50" value={weight} onChange={e => setWeight(Number(e.target.value))} className="w-full accent-robur-yellow" />
        </div>

        {/* Pricing flags */}
        <div className="grid grid-cols-2 gap-2">
          {flagConfig.map(f => {
            const active = flags[f.key];
            return (
              <button
                key={f.key}
                onClick={() => toggleFlag(f.key)}
                className={cn(
                  "flex items-start gap-2 rounded-xl border p-2.5 text-left transition-colors",
                  active ? "border-robur-yellow bg-robur-yellow/10" : "border-robur-light/30 bg-white hover:bg-robur-charcoal/[0.02]"
                )}
              >
                <f.icon className={cn("h-3.5 w-3.5 mt-0.5", active ? "text-robur-yellow" : "text-robur-steel/50")} strokeWidth={2} />
                <div>
                  <p className={cn("text-[10px] font-bold", active ? "text-robur-charcoal" : "text-robur-steel")}>{f.label}</p>
                  <p className="text-[9px] text-robur-steel/50">{f.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Price breakdown */}
        <div className="rounded-xl bg-robur-charcoal/[0.03] p-4 space-y-2">
          <div className="flex justify-between text-[10px]">
            <span className="text-robur-steel">Base rate / tonne</span>
            <span className="font-semibold text-robur-charcoal">${baseRate.toFixed(0)}</span>
          </div>
          {multiplier > 1 && (
            <div className="flex justify-between text-[10px]">
              <span className="text-robur-steel">Premium multiplier</span>
              <span className="font-semibold text-robur-yellow">×{multiplier.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-[10px]">
            <span className="text-robur-steel">Effective rate / tonne</span>
            <span className="font-semibold text-robur-charcoal">${effectiveRate.toFixed(0)}</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-robur-steel">Subtotal</span>
            <span className="font-semibold text-robur-charcoal">${subtotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-robur-steel">GST (10%)</span>
            <span className="font-semibold text-robur-charcoal">${gst.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </div>
          <div className="border-t border-robur-light/30 pt-2 flex justify-between">
            <span className="text-xs font-bold text-robur-charcoal">Total Quote</span>
            <span className="text-lg font-black text-robur-charcoal">${total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}