import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { lazy, Suspense, useEffect } from 'react';
import useAuthStore from './store/authStore';
import InstallPromptBanner from './components/InstallPromptBanner';

// ── Layouts (small, load eagerly — needed for every authenticated route) ──
import AppLayout       from './components/layout/AppLayout';
import SuperAdminLayout from './components/layout/SuperAdminLayout';
import MemberLayout    from './components/layout/MemberLayout';
import StaffLayout     from './components/layout/StaffLayout';
import PrivateRoute    from './routes/PrivateRoute';

// ── Auth (always needed first) ────────────────────────────────────────────
import LoginPage from './pages/Login/LoginPage';

// ── Gym Owner Portal — lazy loaded ───────────────────────────────────────
const DashboardPage      = lazy(() => import('./pages/Dashboard/DashboardPage'));
const MembersPage        = lazy(() => import('./pages/Members/MembersPage'));
const AttendancePage     = lazy(() => import('./pages/Attendance/AttendancePage'));
const SubscriptionsPage  = lazy(() => import('./pages/Subscriptions/SubscriptionsPage'));
const StaffPage          = lazy(() => import('./pages/Staff/StaffPage'));
const InventoryPage      = lazy(() => import('./pages/Inventory/InventoryPage'));
const ReportsPage        = lazy(() => import('./pages/Reports/ReportsPage'));
const GymSettingsPage    = lazy(() => import('./pages/Settings/GymSettingsPage'));
const RevenuePage        = lazy(() => import('./pages/Revenue/RevenuePage'));
const AnnouncementsPage  = lazy(() => import('./pages/Announcements/AnnouncementsPage'));

// ── Super Admin Portal — lazy loaded ─────────────────────────────────────
const SuperDashboardPage = lazy(() => import('./pages/SuperAdmin/SuperDashboardPage'));
const GymsPage           = lazy(() => import('./pages/SuperAdmin/GymsPage'));
const SuperMembersPage   = lazy(() => import('./pages/SuperAdmin/SuperMembersPage'));
const SuperStaffPage     = lazy(() => import('./pages/SuperAdmin/SuperStaffPage'));

// ── Staff Portal — lazy loaded ────────────────────────────────────────────
const StaffDashboard      = lazy(() => import('./pages/Staff/StaffDashboard'));
const StaffMembersPage    = lazy(() => import('./pages/Staff/StaffMembersPage'));
const StaffAttendancePage = lazy(() => import('./pages/Staff/StaffAttendancePage'));
const StaffProfilePage    = lazy(() => import('./pages/Staff/StaffProfilePage'));

// ── Member Portal — lazy loaded ───────────────────────────────────────────
const MemberDashboard    = lazy(() => import('./pages/Member/MemberDashboard'));
const WorkoutSchedulePage = lazy(() => import('./pages/Member/WorkoutSchedulePage'));
const ProgressPage       = lazy(() => import('./pages/Member/ProgressPage'));
const AchievementsPage   = lazy(() => import('./pages/Member/AchievementsPage'));
const MemberProfilePage  = lazy(() => import('./pages/Member/MemberProfilePage'));
const DietChartPage      = lazy(() => import('./pages/Member/DietChartPage'));
const NutritionPage      = lazy(() => import('./pages/Member/NutritionPage'));

// ── Page-level loading spinner ────────────────────────────────────────────
function PageLoader() {
  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0a0a0f',
    }}>
      <div style={{
        width: 40, height: 40,
        border: '3px solid rgba(162,28,206,0.2)',
        borderTopColor: '#a21cce',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function App() {
  const { restoreSession, listenToAuthChanges } = useAuthStore();

  useEffect(() => {
    restoreSession();
    listenToAuthChanges();
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
          error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />

      <InstallPromptBanner />

      {/* Suspense wraps all lazy routes — shows spinner while chunk loads */}
      <Suspense fallback={<PageLoader />}>
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

          {/* ── Gym Owner Portal ── */}
          <Route
            path="/"
            element={
              <PrivateRoute roles={['gym_owner']}>
                <AppLayout />
              </PrivateRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="members"       element={<MembersPage />} />
            <Route path="attendance"    element={<AttendancePage />} />
            <Route path="subscriptions" element={<SubscriptionsPage />} />
            <Route path="staff"         element={<PrivateRoute roles={['gym_owner']}><StaffPage /></PrivateRoute>} />
            <Route path="inventory"     element={<PrivateRoute roles={['gym_owner']}><InventoryPage /></PrivateRoute>} />
            <Route path="revenue"       element={<PrivateRoute roles={['gym_owner']}><RevenuePage /></PrivateRoute>} />
            <Route path="announcements" element={<PrivateRoute roles={['gym_owner']}><AnnouncementsPage /></PrivateRoute>} />
            <Route path="reports"       element={<PrivateRoute roles={['gym_owner']}><ReportsPage /></PrivateRoute>} />
            <Route path="settings"      element={<PrivateRoute roles={['gym_owner']}><GymSettingsPage /></PrivateRoute>} />
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
            <Route index        element={<Navigate to="/member/dashboard" replace />} />
            <Route path="dashboard"    element={<MemberDashboard />} />
            <Route path="schedule"     element={<WorkoutSchedulePage />} />
            <Route path="progress"     element={<ProgressPage />} />
            <Route path="achievements" element={<AchievementsPage />} />
            <Route path="profile"      element={<MemberProfilePage />} />
            <Route path="diet"         element={<DietChartPage />} />
            <Route path="nutrition"    element={<NutritionPage />} />
          </Route>

          {/* ── Staff Portal ── */}
          <Route
            path="/staff-portal"
            element={
              <PrivateRoute roles={['staff']}>
                <StaffLayout />
              </PrivateRoute>
            }
          >
            <Route index           element={<Navigate to="/staff-portal/dashboard" replace />} />
            <Route path="dashboard"  element={<StaffDashboard />} />
            <Route path="members"    element={<StaffMembersPage />} />
            <Route path="attendance" element={<StaffAttendancePage />} />
            <Route path="profile"    element={<StaffProfilePage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
