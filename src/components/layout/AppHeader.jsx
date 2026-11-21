import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.js'
import './AppHeader.css'

const navClass = ({ isActive }) => `app-header__link${isActive ? ' app-header__link--active' : ''}`

/** Barra superior del área privada (panel del estudiante y administración). */
export function AppHeader() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [isLeaving, setIsLeaving] = useState(false)

  async function handleLogout() {
    setIsLeaving(true)
    try {
      await logout()
    } finally {
      navigate('/login', { replace: true })
    }
  }

  return (
    <header className="app-header">
      <Link to="/" className="app-header__brand">
        Portafolio Académico
      </Link>

      <nav className="app-header__nav" aria-label="Navegación principal">
        <NavLink to="/dashboard" className={navClass}>
          Mis portafolios
        </NavLink>
        {user?.role === 'admin' && (
          <NavLink to="/admin" className={navClass}>
            Administración
          </NavLink>
        )}
      </nav>

      <div className="app-header__user">
        <span className="app-header__name" title={user?.email}>
          {user?.fullName}
        </span>
        <button type="button" className="btn btn--ghost" onClick={handleLogout} disabled={isLeaving}>
          {isLeaving ? 'Saliendo…' : 'Cerrar sesión'}
        </button>
      </div>
    </header>
  )
}
