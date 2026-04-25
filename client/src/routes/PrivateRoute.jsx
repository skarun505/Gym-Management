import { Navigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

/**
 * PrivateRoute — guards routes by authentication and role.
 *
 * roles prop accepts an array of allowed roles.
 * redirectTo overrides where unauthorized users are sent.
 */
export default function PrivateRoute({ children, roles, redirectTo = '/login' }) {
  const { user, initialized } = useAuthStore();

  // Still restoring session — show a spinner, never redirect yet
  if (!initialized) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#0f0f1a',
      }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          border: '3px solid rgba(162,28,206,0.2)',
          borderTopColor: '#a21cce',
          animation: 'spin 0.7s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Not logged in → go to login
  if (!user) return <Navigate to="/login" replace />;

  // Role restriction → go to their home
  if (roles && !roles.includes(user.role)) {
    const homeByRole = {
      super_admin: '/super-admin',
      gym_owner: '/',
      staff: '/staff/dashboard',
      member: '/member/dashboard',
    };
    return <Navigate to={homeByRole[user.role] || '/'} replace />;
  }

  return children;
}
