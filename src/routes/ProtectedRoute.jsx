import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'
import { FullPageLoader } from '../components/ui/Spinner.jsx'

/** Solo usuarios con sesión. Si no hay sesión, envía a /login?next=<ruta actual>. */
export function ProtectedRoute() {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) return <FullPageLoader label="Verificando sesión…" />

  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?next=${next}`} replace />
  }

  return <Outlet />
}
