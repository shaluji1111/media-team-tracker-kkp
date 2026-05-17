import { Navigate, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';

import { AppLayout } from './components/Layout';
import { useAuth } from './contexts/AuthContext';
import { WorkTrackDataProvider } from './contexts/WorkTrackDataContext';
import { ForgotPasswordPage, LoginPage, RegisterPage, SetPasswordPage } from './pages/AuthPages';
import { DashboardPage } from './pages/DashboardPages';
import {
  ApprovalsPage,
  AuditLogPage,
  BroadcastsPage,
  LeavePage,
  NotificationsPage,
  ProfilePage,
  ProposalsPage,
  ReportsPage,
  SettingsPage,
  TaskLibraryPage,
  TasksPage,
  TeamPage,
  UsersPage,
} from './pages/ManagementPages';

export function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#0F0F0F] text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 size-10 animate-pulse rounded-2xl bg-blue-500" />
          <p className="text-sm text-zinc-400">Loading WorkTrack</p>
        </div>
      </main>
    );
  }

  return (
    <WorkTrackDataProvider>
      <AppLayout>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/set-password" element={<SetPasswordPage />} />
          <Route path="/" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
          <Route path="/dashboard" element={<Protected><DashboardPage /></Protected>} />
          <Route path="/tasks" element={<Protected><TasksPage /></Protected>} />
          <Route path="/proposals" element={<Protected><ProposalsPage /></Protected>} />
          <Route path="/leave" element={<Protected><LeavePage /></Protected>} />
          <Route path="/notifications" element={<Protected><NotificationsPage /></Protected>} />
          <Route path="/approvals" element={<Protected><ApprovalsPage /></Protected>} />
          <Route path="/reports" element={<Protected><ReportsPage /></Protected>} />
          <Route path="/team" element={<Protected><TeamPage /></Protected>} />
          <Route path="/users" element={<Protected><UsersPage /></Protected>} />
          <Route path="/task-library" element={<Protected><TaskLibraryPage /></Protected>} />
          <Route path="/audit-log" element={<Protected><AuditLogPage /></Protected>} />
          <Route path="/broadcasts" element={<Protected><BroadcastsPage /></Protected>} />
          <Route path="/settings" element={<Protected><SettingsPage /></Protected>} />
          <Route path="/profile" element={<Protected><ProfilePage /></Protected>} />
          <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
        </Routes>
      </AppLayout>
    </WorkTrackDataProvider>
  );
}

function Protected({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (!user.first_login_done) {
    return <Navigate to="/set-password" replace />;
  }
  return children;
}
