import { useState, useEffect } from "react";
import GlassCard from "@/components/ui/GlassCard";
import { CloudSun, Droplets, Wind, Thermometer } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function WeatherHero() {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadWeather() {
      try {
        const res = await base44.integrations.Core.InvokeLLM({
          prompt: "Return the current weather for Melbourne, VIC, Australia as JSON. Include: location, temperature (integer), condition (short text), humidity (integer percent), wind_kmh (integer), feels_like (integer). Use real current data.",
          response_json_schema: {
            type: "object",
            properties: {
              location: { type: "string" },
              temperature: { type: "number" },
              condition: { type: "string" },
              humidity: { type: "number" },
              wind_kmh: { type: "number" },
              feels_like: { type: "number" },
            },
          },
        });
        setWeather(res);
      } catch {
        setWeather(null);
      } finally {
        setLoading(false);
      }
    }
    loadWeather();
  }, []);

  if (loading) {
    return (
      <GlassCard level={2} className="relative overflow-hidden p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-robur-charcoal via-robur-charcoal to-robur-steel/80" />
        <div className="relative flex items-center justify-center" style={{ height: "120px" }}>
          <div className="h-6 w-6 border-2 border-robur-light/30 border-t-robur-yellow rounded-full animate-spin" />
        </div>
      </GlassCard>
    );
  }

  if (!weather) {
    return (
      <GlassCard level={2} className="relative overflow-hidden p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-robur-charcoal via-robur-charcoal to-robur-steel/80" />
        <div className="relative flex flex-col items-center justify-center text-center" style={{ minHeight: "120px" }}>
          <CloudSun className="h-8 w-8 text-robur-light/40 mb-2" strokeWidth={1.5} />
          <p className="text-xs text-robur-light/50">Weather unavailable</p>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard level={2} className="relative overflow-hidden p-6">
      <div className="absolute inset-0 bg-gradient-to-br from-robur-charcoal via-robur-charcoal to-robur-steel/80" />
      <div className="absolute top-0 right-0 w-48 h-48 bg-robur-yellow/10 rounded-full blur-3xl" />

      <div className="relative flex items-center justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CloudSun className="h-5 w-5 text-robur-yellow" strokeWidth={1.5} />
            <span className="text-xs font-medium text-robur-light/60 uppercase tracking-wider">{weather.location}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-bold text-white tracking-tight">{weather.temperature}°</span>
            <span className="text-lg text-robur-light/60">{weather.condition}</span>
          </div>
          <div className="flex items-center gap-4 pt-1">
            <span className="flex items-center gap-1 text-xs text-robur-light/50">
              <Droplets className="h-3 w-3" /> {weather.humidity}%
            </span>
            <span className="flex items-center gap-1 text-xs text-robur-light/50">
              <Wind className="h-3 w-3" /> {weather.wind_kmh} km/h
            </span>
            <span className="flex items-center gap-1 text-xs text-robur-light/50">
              <Thermometer className="h-3 w-3" /> Feels {weather.feels_like}°
            </span>
          </div>
        </div>

        <div className="hidden sm:flex items-center justify-center w-24 h-24 rounded-2xl bg-white/5">
          <CloudSun className="h-12 w-12 text-robur-yellow/80" strokeWidth={1} />
        </div>
      </div>
    </GlassCard>
  );
}