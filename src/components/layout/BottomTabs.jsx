import { useEffect } from 'react';
import { useNavigate, useLocation } from "react-router-dom";
import { Gauge, Package, Truck, FileStack, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTabStack } from "./TabStack";

const tabs = [
  { label: "Executive", icon: Gauge, path: "/" },
  { label: "Jobs", icon: Package, path: "/jobs" },
  { label: "Fleet", icon: Truck, path: "/fleet" },
  { label: "Docs", icon: FileStack, path: "/documents" },
  { label: "Clients", icon: Users, path: "/clients" },
];

export default function BottomTabs() {
  const location = useLocation();
  const navigate = useNavigate();
  const { activeTab, setActiveTab, resetTab, getCurrentTabPath } = useTabStack();

  // Detect which tab root the current path belongs to
  const currentTabPath = tabs.find(t => 
    location.pathname === t.path || 
    location.pathname.startsWith(t.path + '/') ||
    (t.path === "/" && location.pathname === "/")
  )?.path || "/";

  useEffect(() => {
    setActiveTab(currentTabPath);
  }, [currentTabPath, setActiveTab]);

  const handleTabChange = (tabPath) => {
    if (activeTab === tabPath) {
      // Re-tap: reset to root
      resetTab(tabPath);
      navigate(tabPath);
    } else {
      // Switch to different tab
      navigate(tabPath);
    }
  };

  return (
    <nav
      className="glass-2 fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-robur-light/20"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.path;
        return (
          <button
            key={tab.path}
            onClick={() => handleTabChange(tab.path)}
            className="flex flex-1 flex-col items-center gap-1 py-3 min-h-[60px] transition-colors active:opacity-70"
            aria-label={tab.label}
            aria-current={isActive ? "page" : undefined}
          >
            <tab.icon
              className={cn(
                "h-5 w-5 transition-colors",
                isActive
                  ? "text-robur-yellow"
                  : "text-robur-steel"
              )}
              strokeWidth={isActive ? 2.5 : 1.5}
              aria-hidden="true"
            />
            <span
              className={cn(
                "text-[10px] font-medium transition-colors",
                isActive ? "text-robur-charcoal" : "text-robur-steel"
              )}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}