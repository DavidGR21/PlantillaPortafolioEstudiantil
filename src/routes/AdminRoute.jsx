import { Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'
import { StatusMessage } from '../components/ui/StatusMessage.jsx'

/**
 * Solo administradores. Va anidada dentro de <ProtectedRoute>, así que aquí
 * ya hay sesión. (La API valida el rol de nuevo: esto es solo para la interfaz.)
 */
export function AdminRoute() {
  const { user } = useAuth()

  if (user?.role !== 'admin') {
    return (
      <StatusMessage
        code="403"
        title="Acceso restringido"
        message="Esta sección es solo para administradores."
        actionTo="/dashboard"
        actionLabel="Ir a mis portafolios"
      />
    )
  }

  return <Outlet />
}
