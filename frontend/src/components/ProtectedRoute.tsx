import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAppSelector } from '../redux/hooks'

/** `ProtectedRoute` dùng `<Outlet/>` (route layout), không nhận `children`, nên Props chỉ có `requireAdmin`. */
type Props = {
  requireAdmin?: boolean;
}

function ProtectedRoute({ requireAdmin = false }: Props) {
  const { token, user } = useAppSelector((state) => state.auth)
  const location = useLocation()

  if (!token) {
    const loginPath = requireAdmin ? '/admin/login' : '/login'
    return <Navigate to={loginPath} state={{ from: location }} replace />
  }

  if (requireAdmin && user?.role !== 'admin') {
    return <Navigate to="/admin/login" state={{ from: location }} replace />
  }

  return <Outlet />
}

export default ProtectedRoute
