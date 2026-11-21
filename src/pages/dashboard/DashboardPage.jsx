import { AppHeader } from '../../components/layout/AppHeader.jsx'
import { useAuth } from '../../hooks/useAuth.js'

// Provisional: la lista de portafolios llega en el paso 7.
export default function DashboardPage() {
  const { user } = useAuth()

  return (
    <>
      <AppHeader />
      <main className="page">
        <h1>Mis portafolios</h1>
        <p className="text-muted">
          Hola, {user.fullName}. Aquí verás tus portafolios (máximo {user.maxPortfolios}).
        </p>
      </main>
    </>
  )
}
