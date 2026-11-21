import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { LayoutGrid, ShieldCheck } from 'lucide-react'
import { Logo } from '../brand/Logo.jsx'
import { useAuth } from '../../hooks/useAuth.js'
import { ChangePasswordModal } from './ChangePasswordModal.jsx'
import { UserMenu } from './UserMenu.jsx'
import './AppHeader.css'

const navClass = ({ isActive }) => `app-nav__link${isActive ? ' app-nav__link--active' : ''}`

/** Barra superior del área privada (panel del estudiante y administración). */
export function AppHeader() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [isLeaving, setIsLeaving] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)

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
      <div className="app-header__inner">
        <Link to="/dashboard" className="app-header__brand" aria-label="Portafolio Académico, mis portafolios">
          <Logo size={36} />
        </Link>

        <nav className="app-nav" aria-label="Navegación principal">
          <NavLink to="/dashboard" className={navClass}>
            <LayoutGrid size={18} aria-hidden="true" />
            <span className="app-nav__label">Mis portafolios</span>
          </NavLink>
          {user?.role === 'admin' && (
            <NavLink to="/admin" className={navClass}>
              <ShieldCheck size={18} aria-hidden="true" />
              <span className="app-nav__label">Administración</span>
            </NavLink>
          )}
        </nav>

        {user && (
          <UserMenu
            user={user}
            isLeaving={isLeaving}
            onChangePassword={() => setIsChangingPassword(true)}
            onLogout={handleLogout}
          />
        )}
      </div>

      {isChangingPassword && <ChangePasswordModal onClose={() => setIsChangingPassword(false)} />}
    </header>
  )
}
