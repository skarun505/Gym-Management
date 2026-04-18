import { Navigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

/**
 * PrivateRoute — guards routes by authentication and role.
 *
 * roles prop accepts an array of allowed roles.
 * redirectTo overrides where unauthorized users are sent.
 */
export default function PrivateRoute({ children, roles, redirectTo = '/login' }) {
  const { user } = useAuthStore();

  // Not logged in → go to login
  if (!user) return <Navigate to="/login" replace />;

  // Role restriction → go to their home
  if (roles && !roles.includes(user.role)) {
    const homeByRole = {
      super_admin: '/super-admin',
      gym_owner: '/',
      staff: '/',
      member: '/member/dashboard',
    };
    return <Navigate to={homeByRole[user.role] || '/'} replace />;
  }

  return children;
}
