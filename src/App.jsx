import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import PageNotFound from "./lib/PageNotFound";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import UserNotRegisteredError from "@/components/UserNotRegisteredError";
import ScrollToTop from "./components/ScrollToTop";
import ProtectedRoute from "@/components/ProtectedRoute";

// Auth pages
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";

// App layout
import AppLayout from "@/components/layout/AppLayout";

import { lazy, Suspense } from "react";
import PageLoader from "@/components/ui/PageLoader";

// Pages (lazy-loaded for code splitting)
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const StaffDashboard = lazy(() => import("@/pages/StaffDashboard"));
const Fleet = lazy(() => import("@/pages/Fleet"));
const Jobs = lazy(() => import("@/pages/Jobs"));
const MapView = lazy(() => import("@/pages/MapView"));
const ClientPortal = lazy(() => import("@/pages/ClientPortal"));
const Finance = lazy(() => import("@/pages/Finance"));
const Reports = lazy(() => import("@/pages/Reports"));
const Booking = lazy(() => import("@/pages/Booking"));
const Documents = lazy(() => import("@/pages/Documents"));
const ExecutiveDashboard = lazy(() => import("@/pages/ExecutiveDashboard"));
const DMTWorkflow = lazy(() => import("@/pages/DMTWorkflow"));
const MGTWorkflow = lazy(() => import("@/pages/MGTWorkflow"));
const DSSWorkflow = lazy(() => import("@/pages/DSSWorkflow"));
const DailyLog = lazy(() => import("@/pages/DailyLog"));
const MaterialMargin = lazy(() => import("@/pages/MaterialMargin"));
const DriverScorecard = lazy(() => import("@/pages/DriverScorecard"));
const Compliance = lazy(() => import("@/pages/Compliance"));
const BinTracking = lazy(() => import("@/pages/BinTracking"));
const SupplierReconciliation = lazy(() => import("@/pages/SupplierReconciliation"));
const AgentChat = lazy(() => import("@/pages/AgentChat"));

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-robur-yellow">
            <span className="text-lg font-black text-robur-charcoal">R</span>
          </div>
          <div className="w-8 h-8 border-2 border-robur-light border-t-robur-charcoal rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === "user_not_registered") {
      return <UserNotRegisteredError />;
    } else if (authError.type === "auth_required") {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Suspense fallback={<PageLoader />}>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<ExecutiveDashboard />} />
          <Route path="/operations" element={<StaffDashboard />} />
          <Route path="/driver" element={<Dashboard />} />
          <Route path="/fleet" element={<Fleet />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/map" element={<MapView />} />
          <Route path="/clients" element={<ClientPortal />} />
          <Route path="/finance" element={<Finance />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/booking" element={<Booking />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/dmt" element={<DMTWorkflow />} />
          <Route path="/mgt" element={<MGTWorkflow />} />
          <Route path="/dss" element={<DSSWorkflow />} />
          <Route path="/daily-log" element={<DailyLog />} />
          <Route path="/margins" element={<MaterialMargin />} />
          <Route path="/drivers" element={<DriverScorecard />} />
          <Route path="/compliance" element={<Compliance />} />
          <Route path="/bins" element={<BinTracking />} />
          <Route path="/reconciliation" element={<SupplierReconciliation />} />
          <Route path="/agent-chat" element={<AgentChat />} />
        </Route>
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
    </Suspense>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;