import { Link } from 'react-router-dom'
import { ChevronDown, House, Menu, PenLine, X } from 'lucide-react'
import { LogoMark } from '../../brand/Logo.jsx'
import { initialsOf } from '../../../utils/format.js'

/**
 * Menú lateral del portafolio público: inicio, apartados y, dentro del
 * apartado activo, sus parciales. En móvil se abre como menú desplegable.
 */
export function PortfolioSidebar({ portfolio, sections, activeSectionId, activeSubId, canEdit, open, onToggle, onNavigate }) {
  const base = `/p/${portfolio.slug}`

  return (
    <>
      {/* Barra superior en móvil */}
      <div className="site-topbar">
        <Link to={base} className="site-topbar__brand" onClick={onNavigate}>
          <span className="site-monogram site-monogram--sm" aria-hidden="true">
            {initialsOf(portfolio.title)}
          </span>
          <span className="site-topbar__title">{portfolio.title}</span>
        </Link>
        <button type="button" className="site-topbar__menu" onClick={onToggle} aria-expanded={open} aria-controls="site-nav">
          {open ? <X size={22} /> : <Menu size={22} />}
          <span className="visually-hidden">{open ? 'Cerrar menú' : 'Abrir menú'}</span>
        </button>
      </div>

      <aside id="site-nav" className={`site-sidebar${open ? ' site-sidebar--open' : ''}`} aria-label="Menú del portafolio">
        <div className="site-sidebar__brand">
          <span className="site-monogram site-monogram--brand" aria-hidden="true">
            {initialsOf(portfolio.title)}
          </span>
          <div className="site-sidebar__brand-text">
            <span className="site-sidebar__kicker">Portafolio académico</span>
            <Link to={base} className="site-sidebar__title" onClick={onNavigate}>
              {portfolio.title}
            </Link>
            <span className="site-sidebar__owner">{portfolio.ownerName}</span>
          </div>
        </div>

        <nav className="site-nav">
          <Link to={base} className={`site-nav__link${!activeSectionId ? ' site-nav__link--active' : ''}`} onClick={onNavigate} aria-current={!activeSectionId ? 'page' : undefined}>
            <House size={17} aria-hidden="true" />
            Inicio
          </Link>

          {sections.length > 0 && <p className="site-nav__heading">Apartados</p>}
          <ul className="site-nav__list">
            {sections.map((section) => {
              const isActive = section.id === activeSectionId
              return (
                <li key={section.id}>
                  <Link
                    to={`${base}/${section.slug}`}
                    className={`site-nav__link${isActive ? ' site-nav__link--active' : ''}`}
                    onClick={onNavigate}
                    aria-current={isActive && !activeSubId ? 'page' : undefined}
                  >
                    <span className="site-nav__label">{section.title}</span>
                    {section.subsections.length > 0 && (
                      <ChevronDown size={15} className={`site-nav__chevron${isActive ? ' site-nav__chevron--open' : ''}`} aria-hidden="true" />
                    )}
                  </Link>
                  {isActive && section.subsections.length > 0 && (
                    <ul className="site-nav__sub">
                      {section.subsections.map((sub) => {
                        const subActive = sub.id === activeSubId
                        return (
                          <li key={sub.id}>
                            <Link
                              to={`${base}/${section.slug}?parcial=${sub.id}`}
                              className={`site-nav__sublink${subActive ? ' site-nav__sublink--active' : ''}`}
                              onClick={onNavigate}
                              aria-current={subActive ? 'page' : undefined}
                            >
                              {sub.title}
                              <span className="site-nav__count">{sub.posts.length}</span>
                            </Link>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="site-sidebar__footer">
          {canEdit && (
            <Link to={`${base}/editar`} className="btn btn--primary btn--block">
              <PenLine size={16} aria-hidden="true" />
              Editar portafolio
            </Link>
          )}
          <Link to="/" className="site-sidebar__made">
            <LogoMark size={22} />
            Portafolio Académico
          </Link>
        </div>
      </aside>

      {open && <button type="button" className="site-scrim" onClick={onToggle} aria-label="Cerrar menú" tabIndex={-1} />}
    </>
  )
}
