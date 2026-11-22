import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { AppLayout } from './components/layout/AppLayout';
import { ToastProvider } from './components/shared/Toast';
import { LoginPage } from './pages/LoginPage';
import { PageLoader } from './components/shared/LoadingSpinner';

// Lazy load pages — using default or named exports as each page provides
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const EmployeesPage = React.lazy(() => import('./pages/Employees'));
const BrandsPage = React.lazy(() => import('./pages/Brands'));
const PodsPage = React.lazy(() => import('./pages/Pods').then(m => ({ default: m.PodsPage })));
const RosterPage = React.lazy(() => import('./pages/Roster'));
const TasksPage = React.lazy(() => import('./pages/Tasks'));
const LeavePage = React.lazy(() => import('./pages/Leave').then(m => ({ default: m.LeavePage })));
const HolidaysPage = React.lazy(() => import('./pages/Holidays').then(m => ({ default: m.HolidaysPage })));
const CoveragePage = React.lazy(() => import('./pages/Coverage'));
const NotificationsPage = React.lazy(() => import('./pages/Notifications'));
const SettingsPage = React.lazy(() => import('./pages/Settings'));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuthStore();
  if (loading) return <PageLoader />;
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const { initialize, loading } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (loading) return (
    <ToastProvider>
      <div className="min-h-screen flex items-center justify-center">
        <PageLoader />
      </div>
    </ToastProvider>
  );

  return (
    <ToastProvider>
      <React.Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="employees" element={<EmployeesPage />} />
            <Route path="brands" element={<BrandsPage />} />
            <Route path="pods" element={<PodsPage />} />
            <Route path="roster" element={<RosterPage />} />
            <Route path="tasks" element={<TasksPage />} />
            <Route path="leave" element={<LeavePage />} />
            <Route path="holidays" element={<HolidaysPage />} />
            <Route path="coverage" element={<CoveragePage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </React.Suspense>
    </ToastProvider>
  );
}
