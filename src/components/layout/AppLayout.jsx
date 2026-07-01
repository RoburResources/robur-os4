import { useCallback } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import BottomTabs from "./BottomTabs";
import MobileHeader from "./MobileHeader";
import PageTransition from "@/components/ui/PageTransition";
import QuickActionMenu from "@/components/ui/QuickActionMenu";
import OutdoorModeToggle from "@/components/ui/OutdoorModeToggle";
import DriverModeToggle from "@/components/ui/DriverModeToggle";
import SpatialMapOverlay from "@/components/ui/SpatialMapOverlay";
import { TabStackProvider } from "./TabStack";
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
    <TabStackProvider>
      <div className="min-h-screen relative">
        {/* Blurred background image */}
        <div
          className="fixed inset-0 -z-20 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1920&q=80')",
            filter: "blur(60px) brightness(0.85) saturate(1.1)",
            transform: "scale(1.1)",
          }}
        />
        {/* Dark overlay for readability */}
        <div className="fixed inset-0 -z-10 bg-gradient-to-br from-robur-charcoal/40 via-robur-charcoal/30 to-robur-charcoal/50" />
        {/* Ambient background shapes */}
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-robur-yellow/8 blur-3xl" />
          <div className="absolute top-1/3 -left-20 h-60 w-60 rounded-full bg-robur-steel/8 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 h-40 w-40 rounded-full bg-robur-yellow/5 blur-2xl" />
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
            {/* Outdoor + Driver mode toggles — top right on mobile */}
            <div className="fixed top-3 right-4 z-[55] flex items-center gap-2">
              <DriverModeToggle />
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
            <SpatialMapOverlay />
          </>
        ) : (
          <>
            <Sidebar />
            <main className="ml-64 min-h-screen p-8">
              <PageTransition>
                <Outlet />
              </PageTransition>
            </main>
            <SpatialMapOverlay />
          </>
        )}
      </div>
    </TabStackProvider>
  );
}