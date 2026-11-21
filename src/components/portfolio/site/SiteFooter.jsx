import { Link } from 'react-router-dom'
import { ArrowUp, GraduationCap } from 'lucide-react'
import { LogoMark } from '../../brand/Logo.jsx'
import { initialsOf } from '../../../utils/format.js'

const YEAR = new Date().getFullYear()

/** Pie del portafolio: datos del estudiante y la institución, apartados y «volver arriba». */
export function SiteFooter({ portfolio, sections }) {
  const base = `/p/${portfolio.slug}`
  const cover = portfolio.coverInfo ?? {}

  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__about">
          <div className="site-footer__brand">
            <span className="site-monogram site-monogram--footer" aria-hidden="true">
              {initialsOf(portfolio.title)}
            </span>
            <div>
              <p className="site-footer__title">{portfolio.title}</p>
              <p className="site-footer__owner">{portfolio.ownerName}</p>
            </div>
          </div>
          {(cover.institution || cover.subtitle) && (
            <p className="site-footer__institution">
              <GraduationCap size={16} aria-hidden="true" />
              <span>{[cover.institution, cover.subtitle].filter(Boolean).join(' · ')}</span>
            </p>
          )}
        </div>

        {sections.length > 0 && (
          <nav className="site-footer__nav" aria-label="Apartados (pie de página)">
            <p className="site-footer__heading">Apartados</p>
            <ul>
              <li>
                <Link to={base}>Inicio</Link>
              </li>
              {sections.map((section) => (
                <li key={section.id}>
                  <Link to={`${base}/${section.slug}`}>{section.title}</Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <div className="site-footer__aside">
          <button type="button" className="site-footer__top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <ArrowUp size={16} aria-hidden="true" />
            Volver arriba
          </button>
        </div>
      </div>

      <div className="site-footer__bottom">
        <span>
          © {YEAR} {portfolio.ownerName}
        </span>
        <Link to="/" className="site-footer__made">
          <LogoMark size={20} />
          Creado con Portafolio Académico
        </Link>
      </div>
    </footer>
  )
}
