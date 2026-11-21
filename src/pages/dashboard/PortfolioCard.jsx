import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Check,
  Clock3,
  Copy,
  ExternalLink,
  FileText,
  Globe,
  LayoutList,
  PenLine,
  ShieldAlert,
  Trash2,
} from 'lucide-react'
import { formatDate, formatRelativeTime, initialsOf } from '../../utils/format.js'
import { publicPortfolioUrl } from '../../utils/slug.js'
import { themeToStyle } from '../../utils/theme.js'

/** Tarjeta de un portafolio en «Mis portafolios». */
export function PortfolioCard({ portfolio, onDelete }) {
  const [copied, setCopied] = useState(false)
  const isBlocked = portfolio.status === 'blocked'
  const url = publicPortfolioUrl(portfolio.slug)
  const lastActivity = portfolio.lastActivityAt ?? portfolio.updatedAt

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [copied])

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      // Sin permiso de portapapeles: el enlace sigue visible para copiarlo a mano.
    }
  }

  const stats = [
    { icon: LayoutList, value: portfolio.sectionsCount ?? 0, label: portfolio.sectionsCount === 1 ? 'Apartado' : 'Apartados' },
    { icon: FileText, value: portfolio.postsCount ?? 0, label: portfolio.postsCount === 1 ? 'Publicación' : 'Publicaciones' },
  ]

  return (
    <article
      className={`pcard${isBlocked ? ' pcard--blocked' : ''}`}
      style={themeToStyle(portfolio.theme)}
      aria-labelledby={`pcard-title-${portfolio.id}`}
    >
      {/* Portada con el color del portafolio */}
      <div className="pcard__cover">
        <span className="pcard__monogram" aria-hidden="true">
          {initialsOf(portfolio.title)}
        </span>
        <span className={`pcard__status${isBlocked ? ' pcard__status--blocked' : ''}`}>
          <span className="pcard__status-dot" aria-hidden="true" />
          {isBlocked ? 'Bloqueado' : 'Publicado'}
        </span>
      </div>

      <div className="pcard__body">
        <h2 id={`pcard-title-${portfolio.id}`} className="pcard__title">
          {portfolio.title}
        </h2>
        {portfolio.subtitle ? (
          <p className="pcard__subtitle">{portfolio.subtitle}</p>
        ) : (
          <p className="pcard__subtitle pcard__subtitle--empty">Sin subtítulo</p>
        )}

        {isBlocked && (
          <div className="pcard__blocked" role="note">
            <ShieldAlert size={18} aria-hidden="true" />
            <p>
              <strong>No visible públicamente.</strong>{' '}
              {portfolio.blockedReason ? `Motivo: ${portfolio.blockedReason}` : 'Un administrador lo bloqueó.'}
            </p>
          </div>
        )}

        {/* Enlace público */}
        <div className="pcard__link">
          <Globe className="pcard__link-icon" size={16} aria-hidden="true" />
          <span className="pcard__link-text" title={url}>
            {url.replace(/^https?:\/\//, '')}
          </span>
          <button
            type="button"
            className={`pcard__link-btn${copied ? ' pcard__link-btn--done' : ''}`}
            onClick={copyLink}
            aria-label={copied ? 'Enlace copiado' : 'Copiar enlace'}
            title={copied ? '¡Copiado!' : 'Copiar enlace'}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
          <a
            className="pcard__link-btn"
            href={url}
            target="_blank"
            rel="noreferrer"
            aria-label="Abrir portafolio en una pestaña nueva"
            title="Abrir en una pestaña nueva"
          >
            <ExternalLink size={16} />
          </a>
        </div>
        <span className="visually-hidden" role="status">
          {copied ? 'Enlace copiado al portapapeles' : ''}
        </span>

        {/* Cifras: dos contadores y, debajo, la última actividad */}
        <div className="pcard__stats">
          <dl className="pcard__counts">
            {stats.map(({ icon: Icon, value, label }) => (
              <div key={label} className="pcard__stat">
                <dt>
                  <Icon size={15} aria-hidden="true" />
                  {label}
                </dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <p className="pcard__activity">
            <Clock3 size={15} aria-hidden="true" />
            Actualizado{' '}
            <time dateTime={lastActivity} title={formatDate(lastActivity)}>
              {formatRelativeTime(lastActivity)}
            </time>
          </p>
        </div>
      </div>

      <footer className="pcard__actions">
        <Link className="btn btn--primary pcard__edit" to={`/p/${portfolio.slug}/editar`}>
          <PenLine size={17} aria-hidden="true" />
          Editar
        </Link>
        <a className="btn btn--ghost" href={url} target="_blank" rel="noreferrer">
          <ExternalLink size={17} aria-hidden="true" />
          Ver
        </a>
        <button
          type="button"
          className="btn btn--ghost btn--icon pcard__delete"
          onClick={() => onDelete(portfolio)}
          aria-label={`Eliminar «${portfolio.title}»`}
          title="Eliminar portafolio"
        >
          <Trash2 size={17} />
        </button>
      </footer>
    </article>
  )
}
