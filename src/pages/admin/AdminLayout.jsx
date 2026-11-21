import { NavLink, Outlet } from 'react-router-dom'
import { AppHeader } from '../../components/layout/AppHeader.jsx'
import './Admin.css'

const LINKS = [
  { to: '/admin/usuarios', label: 'Usuarios' },
  { to: '/admin/portafolios', label: 'Portafolios', soon: true },
  { to: '/admin/bitacora', label: 'Bitácora', soon: true },
]

/** Estructura común del panel de administración (cabecera + pestañas). */
export default function AdminLayout() {
  return (
    <>
      <AppHeader />
      <main className="page admin">
        <header className="admin__header">
          <h1 className="admin__title">Administración</h1>
          <nav className="admin__tabs" aria-label="Secciones de administración">
            {LINKS.map((link) =>
              link.soon ? (
                <span key={link.to} className="admin__tab admin__tab--soon" title="Próximamente">
                  {link.label}
                </span>
              ) : (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) => `admin__tab${isActive ? ' admin__tab--active' : ''}`}
                >
                  {link.label}
                </NavLink>
              ),
            )}
          </nav>
        </header>
        <Outlet />
      </main>
    </>
  )
}
