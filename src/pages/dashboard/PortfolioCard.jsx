import { useState } from 'react'
import { Link } from 'react-router-dom'
import { formatDate, pluralize } from '../../utils/format.js'
import { publicPortfolioUrl } from '../../utils/slug.js'

export function PortfolioCard({ portfolio, onDelete }) {
  const [copied, setCopied] = useState(false)
  const isBlocked = portfolio.status === 'blocked'
  const url = publicPortfolioUrl(portfolio.slug)

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Sin permiso de portapapeles: el enlace sigue visible para copiarlo a mano.
    }
  }

  return (
    <article className={`portfolio-card${isBlocked ? ' portfolio-card--blocked' : ''}`}>
      <header className="portfolio-card__header">
        <h2 className="portfolio-card__title">{portfolio.title}</h2>
        <span className={`badge ${isBlocked ? 'badge--danger' : 'badge--success'}`}>
          {isBlocked ? 'Bloqueado' : 'Publicado'}
        </span>
      </header>

      {portfolio.subtitle && <p className="portfolio-card__subtitle">{portfolio.subtitle}</p>}

      {isBlocked && (
        <p className="alert alert--error portfolio-card__blocked">
          Un administrador bloqueó este portafolio y no es visible públicamente.
          {portfolio.blockedReason && (
            <>
              <br />
              Motivo: {portfolio.blockedReason}
            </>
          )}
        </p>
      )}

      <div className="portfolio-card__link">
        <a href={url} target="_blank" rel="noreferrer" title="Abrir en una pestaña nueva">
          {url.replace(/^https?:\/\//, '')}
        </a>
        <button type="button" className="btn btn--ghost btn--sm" onClick={copyLink}>
          {copied ? '¡Copiado!' : 'Copiar'}
        </button>
      </div>

      <p className="portfolio-card__meta">
        {pluralize(portfolio.sectionsCount ?? 0, 'apartado', 'apartados')} ·{' '}
        {pluralize(portfolio.postsCount ?? 0, 'publicación', 'publicaciones')} · Actualizado el{' '}
        {formatDate(portfolio.updatedAt)}
      </p>

      <footer className="portfolio-card__actions">
        <Link className="btn btn--primary btn--sm" to={`/p/${portfolio.slug}/editar`}>
          Editar
        </Link>
        <a className="btn btn--ghost btn--sm" href={url} target="_blank" rel="noreferrer">
          Ver
        </a>
        <button
          type="button"
          className="btn btn--ghost btn--sm portfolio-card__delete"
          onClick={() => onDelete(portfolio)}
        >
          Eliminar
        </button>
      </footer>
    </article>
  )
}
