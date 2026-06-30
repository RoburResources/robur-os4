import { useCallback } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import BottomTabs from "./BottomTabs";
import MobileHeader from "./MobileHeader";
import PageTransition from "@/components/ui/PageTransition";
import QuickActionMenu from "@/components/ui/QuickActionMenu";
import OutdoorModeToggle from "@/components/ui/OutdoorModeToggle";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useIsMobile } from "@/hooks/use-mobile";
import { RefreshCw } from "lucide-react";

export default function AppLayout() {
  const isMobile = useIsMobile();

  const handleRefresh = useCallback(async () => {
    window.location.reload();
  }, []);

  const { pullDistance, isRefreshing } = usePullToRefresh(handleRefresh, {
    enabled: isMobile,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100/50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950/50">
      {/* Ambient background shapes */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-robur-yellow/5 blur-3xl" />
        <div className="absolute top-1/3 -left-20 h-60 w-60 rounded-full bg-robur-steel/5 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-40 w-40 rounded-full bg-robur-yellow/3 blur-2xl" />
      </div>

      {/* Pull-to-refresh indicator */}
      {isMobile && (pullDistance > 0 || isRefreshing) && (
        <div
          className="fixed top-0 left-0 right-0 z-[60] flex items-center justify-center overflow-hidden"
          style={{ height: `${pullDistance}px` }}
        >
          <RefreshCw
            className={`h-5 w-5 text-robur-steel transition-transform ${isRefreshing ? 'animate-spin' : ''}`}
            style={{ transform: `rotate(${pullDistance * 3}deg)` }}
          />
        </div>
      )}

      {isMobile ? (
        <>
          <MobileHeader />
          {/* Outdoor mode toggle — top right on mobile */}
          <div className="fixed top-3 right-4 z-[55]">
            <OutdoorModeToggle />
          </div>
          <main
            className="min-h-screen"
            style={{
              paddingTop: "calc(3.5rem + env(safe-area-inset-top))",
              paddingBottom: "calc(4.5rem + env(safe-area-inset-bottom))",
            }}
          >
            <div className="p-4">
              <PageTransition>
                <Outlet />
              </PageTransition>
            </div>
          </main>
          <BottomTabs />
          <QuickActionMenu />
        </>
      ) : (
        <>
          <Sidebar />
          <main className="ml-64 min-h-screen p-8">
            <PageTransition>
              <Outlet />
            </PageTransition>
          </main>
        </>
      )}
    </div>
  );
}