import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import useAuthStore from './store/authStore';
import InstallPromptBanner from './components/InstallPromptBanner';

// Layouts
import AppLayout from './components/layout/AppLayout';
import SuperAdminLayout from './components/layout/SuperAdminLayout';

// Route guards
import PrivateRoute from './routes/PrivateRoute';

// Auth
import LoginPage from './pages/Login/LoginPage';

// Gym Portal (gym_owner + staff)
import DashboardPage from './pages/Dashboard/DashboardPage';
import MembersPage from './pages/Members/MembersPage';
import AttendancePage from './pages/Attendance/AttendancePage';
import SubscriptionsPage from './pages/Subscriptions/SubscriptionsPage';
import StaffPage from './pages/Staff/StaffPage';
import InventoryPage from './pages/Inventory/InventoryPage';
import ReportsPage from './pages/Reports/ReportsPage';
import GymSettingsPage from './pages/Settings/GymSettingsPage';

// Super Admin Portal
import SuperDashboardPage from './pages/SuperAdmin/SuperDashboardPage';
import GymsPage from './pages/SuperAdmin/GymsPage';
import SuperMembersPage from './pages/SuperAdmin/SuperMembersPage';
import SuperStaffPage from './pages/SuperAdmin/SuperStaffPage';

// Layouts
import MemberLayout from './components/layout/MemberLayout';

// Member Portal
import MemberDashboard from './pages/Member/MemberDashboard';
import WorkoutSchedulePage from './pages/Member/WorkoutSchedulePage';
import ProgressPage from './pages/Member/ProgressPage';
import AchievementsPage from './pages/Member/AchievementsPage';
import MemberProfilePage from './pages/Member/MemberProfilePage';

export default function App() {
  const { restoreSession } = useAuthStore();

  // Restore Supabase session on app load
  useEffect(() => {
    restoreSession();
  }, []);

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1a1a27',
            color: '#f3f4f6',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
          },
          success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />

      {/* PWA install prompt — shows after 30s on any page */}
      <InstallPromptBanner />
      <Routes>
        {/* ── Public ── */}
        <Route path="/login" element={<LoginPage />} />

        {/* ── Super Admin Portal ── */}
        <Route
          path="/super-admin"
          element={
            <PrivateRoute roles={['super_admin']}>
              <SuperAdminLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<SuperDashboardPage />} />
          <Route path="gyms"    element={<GymsPage />} />
          <Route path="members" element={<SuperMembersPage />} />
          <Route path="staff"   element={<SuperStaffPage />} />
        </Route>

        {/* ── Gym Management Portal (gym_owner + staff) ── */}
        <Route
          path="/"
          element={
            <PrivateRoute roles={['gym_owner', 'staff']}>
              <AppLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="members" element={<MembersPage />} />
          <Route path="attendance" element={<AttendancePage />} />
          <Route path="subscriptions" element={<SubscriptionsPage />} />
          <Route
            path="staff"
            element={
              <PrivateRoute roles={['gym_owner']}>
                <StaffPage />
              </PrivateRoute>
            }
          />
          <Route
            path="inventory"
            element={
              <PrivateRoute roles={['gym_owner']}>
                <InventoryPage />
              </PrivateRoute>
            }
          />
          <Route
            path="reports"
            element={
              <PrivateRoute roles={['gym_owner']}>
                <ReportsPage />
              </PrivateRoute>
            }
          />
          <Route
            path="settings"
            element={
              <PrivateRoute roles={['gym_owner']}>
                <GymSettingsPage />
              </PrivateRoute>
            }
          />
        </Route>

        {/* ── Catch-all ── */}
        <Route path="*" element={<Navigate to="/" replace />} />

        {/* ── Member Portal ── */}
        <Route
          path="/member"
          element={
            <PrivateRoute roles={['member']}>
              <MemberLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="/member/dashboard" replace />} />
          <Route path="dashboard"    element={<MemberDashboard />} />
          <Route path="schedule"     element={<WorkoutSchedulePage />} />
          <Route path="progress"     element={<ProgressPage />} />
          <Route path="achievements" element={<AchievementsPage />} />
          <Route path="profile"      element={<MemberProfilePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
