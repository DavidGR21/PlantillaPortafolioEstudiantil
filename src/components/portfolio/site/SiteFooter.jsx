import { Link } from 'react-router-dom'
import { ArrowUp, GraduationCap } from 'lucide-react'
import { LogoMark } from '../../brand/Logo.jsx'
import { initialsOf } from '../../../utils/format.js'

const YEAR = new Date().getFullYear()

/**
 * Pie compacto del portafolio: estudiante e institución, accesos a los apartados
 * (los nombres largos se recortan con «…» y muestran el nombre completo al pasar
 * el ratón) y «volver arriba».
 */
export function SiteFooter({ portfolio, sections }) {
  const base = `/p/${portfolio.slug}`
  const cover = portfolio.coverInfo ?? {}
  const institution = [cover.institution, cover.subtitle].filter(Boolean).join(' · ')

  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__top-row">
          <div className="site-footer__brand">
            <span className="site-monogram site-monogram--footer" aria-hidden="true">
              {initialsOf(portfolio.title)}
            </span>
            <div className="site-footer__identity">
              <p className="site-footer__title">{portfolio.title}</p>
              <p className="site-footer__owner">
                {portfolio.ownerName}
                {institution && (
                  <span className="site-footer__institution">
                    <GraduationCap size={14} aria-hidden="true" />
                    {institution}
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="site-footer__top"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <ArrowUp size={15} aria-hidden="true" />
            <span className="site-footer__top-label">Volver arriba</span>
          </button>
        </div>

        {sections.length > 0 && (
          <nav className="site-footer__nav" aria-label="Apartados (pie de página)">
            <ul>
              <li>
                <Link to={base}>Inicio</Link>
              </li>
              {sections.map((section) => (
                <li key={section.id}>
                  <Link to={`${base}/${section.slug}`} title={section.title}>
                    {section.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <div className="site-footer__bottom">
          <span>
            © {YEAR} {portfolio.ownerName}
          </span>
          <Link to="/" className="site-footer__made">
            <LogoMark size={16} />
            Creado con Portafolio Académico
          </Link>
        </div>
      </div>
    </footer>
  )
}
