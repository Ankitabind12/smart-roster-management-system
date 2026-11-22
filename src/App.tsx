import React, { useEffect, Component } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { AppLayout } from './components/layout/AppLayout';
import { ToastProvider } from './components/shared/Toast';
import { LoginPage } from './pages/LoginPage';
import { PageLoader } from './components/shared/LoadingSpinner';

// ---------------------------------------------------------------------------
// Global Error Boundary — catches any render crash and shows a friendly panel
// ---------------------------------------------------------------------------
interface EBState { hasError: boolean; error?: Error }
class ErrorBoundary extends Component<{ children: React.ReactNode }, EBState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error): EBState {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center space-y-4">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 110 18A9 9 0 0112 3z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Something went wrong</h2>
            <p className="text-sm text-slate-500">
              {this.state.error?.message ?? 'An unexpected error occurred.'}
            </p>
            <p className="text-xs text-slate-400">
              If tables are missing, run the SQL migration in the{' '}
              <a href="https://supabase.com/dashboard/project/mukbsmqzoizhcfafjszo/sql/new"
                 target="_blank" rel="noreferrer"
                 className="text-blue-500 underline">
                Supabase SQL Editor
              </a>.
            </p>
            <button
              onClick={() => { this.setState({ hasError: false }); window.location.href = '/'; }}
              className="btn-primary w-full"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Lazy load pages
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
    <ErrorBoundary>
      <ToastProvider>
        <React.Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }>
              <Route index element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
              <Route path="employees" element={<ErrorBoundary><EmployeesPage /></ErrorBoundary>} />
              <Route path="brands" element={<ErrorBoundary><BrandsPage /></ErrorBoundary>} />
              <Route path="pods" element={<ErrorBoundary><PodsPage /></ErrorBoundary>} />
              <Route path="roster" element={<ErrorBoundary><RosterPage /></ErrorBoundary>} />
              <Route path="tasks" element={<ErrorBoundary><TasksPage /></ErrorBoundary>} />
              <Route path="leave" element={<ErrorBoundary><LeavePage /></ErrorBoundary>} />
              <Route path="holidays" element={<ErrorBoundary><HolidaysPage /></ErrorBoundary>} />
              <Route path="coverage" element={<ErrorBoundary><CoveragePage /></ErrorBoundary>} />
              <Route path="notifications" element={<ErrorBoundary><NotificationsPage /></ErrorBoundary>} />
              <Route path="settings" element={<ErrorBoundary><SettingsPage /></ErrorBoundary>} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </React.Suspense>
      </ToastProvider>
    </ErrorBoundary>
  );
}
