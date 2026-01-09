import { Suspense, lazy, useState, useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { checkSession } from "./api/apiClient";

// Lazy load pages for better performance
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const GraphicsPage = lazy(() => import("./pages/GraphicsPage"));
const BalancePage = lazy(() => import("./pages/BalancePage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

function PageLoader() {
  return (
    <div className="animate-fade-in min-h-[50vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-xs text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    let mounted = true;
    checkSession().then((isAuth) => {
      if (mounted) {
        setAuthenticated(isAuth);
        setChecking(false);
        if (!isAuth) {
          // Redirect to login page (server-rendered)
          window.location.href = '/login';
        }
      }
    });
    return () => { mounted = false; };
  }, []);

  // Show minimal loading while checking auth
  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Verifying session...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, show nothing (redirect is happening)
  if (!authenticated) {
    return null;
  }

  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthGate>
          <Routes>
            <Route element={<AppShell />}>
              <Route
                path="/"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <div className="animate-fade-in">
                      <DashboardPage />
                    </div>
                  </Suspense>
                }
              />
              <Route
                path="/graphics"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <div className="animate-fade-in">
                      <GraphicsPage />
                    </div>
                  </Suspense>
                }
              />
              <Route
                path="/balance"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <div className="animate-fade-in">
                      <BalancePage />
                    </div>
                  </Suspense>
                }
              />
              <Route
                path="/admin"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <div className="animate-fade-in">
                      <AdminPage />
                    </div>
                  </Suspense>
                }
              />
              {/* Redirect old settings URL to admin */}
              <Route path="/settings" element={<Navigate to="/admin" replace />} />
            </Route>
            <Route
              path="*"
              element={
                <Suspense fallback={<PageLoader />}>
                  <div className="animate-fade-in">
                    <NotFound />
                  </div>
                </Suspense>
              }
            />
          </Routes>
        </AuthGate>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
