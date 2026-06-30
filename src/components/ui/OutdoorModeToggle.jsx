import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";

export default function OutdoorModeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const isOutdoor = theme === "outdoor";

  return (
    <button
      onClick={() => setTheme(isOutdoor ? "light" : "outdoor")}
      className="flex h-9 w-9 items-center justify-center rounded-xl glass-2 transition-colors hover:bg-white/90"
      title={isOutdoor ? "Switch to standard mode" : "Switch to outdoor/high-contrast mode"}
    >
      <Sun
        className={`h-4 w-4 transition-colors ${isOutdoor ? "text-robur-yellow" : "text-robur-steel"}`}
        strokeWidth={2}
      />
    </button>
  );
}