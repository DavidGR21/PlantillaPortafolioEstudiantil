import { Link } from 'react-router-dom'
import { ArrowRight, FileText, FolderOpen, Layers, PenLine } from 'lucide-react'
import { initialsOf, pluralize } from '../../../utils/format.js'

/** Página de inicio del portafolio: presentación y tarjetas de los apartados. */
export function PortfolioOverview({ portfolio, sections, canEdit }) {
  const base = `/p/${portfolio.slug}`

  return (
    <>
      <header className="site-hero site-hero--home">
        <div className="site-hero__inner">
          <span className="site-monogram site-monogram--lg" aria-hidden="true">
            {initialsOf(portfolio.title)}
          </span>
          <p className="site-hero__eyebrow">Portafolio académico de {portfolio.ownerName}</p>
          <h1 className="site-hero__title">
            <span>{portfolio.title}</span>
          </h1>
          {portfolio.subtitle && <p className="site-hero__subtitle">{portfolio.subtitle}</p>}
        </div>
      </header>

      <div className="site-content">
        {portfolio.description && (
          <section className="site-intro" aria-label="Presentación">
            <p>{portfolio.description}</p>
          </section>
        )}

        {sections.length === 0 ? (
          <div className="site-empty">
            <FolderOpen size={32} aria-hidden="true" />
            <h2>Este portafolio aún no tiene contenido</h2>
            {canEdit && (
              <Link className="btn btn--primary" to={`${base}/editar`}>
                <PenLine size={16} aria-hidden="true" />
                Agregar el primer apartado
              </Link>
            )}
          </div>
        ) : (
          <section aria-labelledby="sections-title">
            <h2 id="sections-title" className="site-content__title">
              Apartados
            </h2>
            <ul className="section-cards">
              {sections.map((section, i) => {
                const posts = section.subsections.reduce((n, s) => n + s.posts.length, 0)
                const docs = section.subsections.reduce((n, s) => n + s.posts.reduce((m, p) => m + p.files.length, 0), 0)
                return (
                  <li key={section.id}>
                    <Link to={`${base}/${section.slug}`} className="section-card">
                      <span className="section-card__number">{String(i + 1).padStart(2, '0')}</span>
                      <span className="section-card__title">{section.title}</span>
                      {section.subsections.length > 0 && (
                        <span className="section-card__subs">
                          {section.subsections.map((sub) => (
                            <span key={sub.id} className="section-card__chip">
                              {sub.title}
                            </span>
                          ))}
                        </span>
                      )}
                      <span className="section-card__meta">
                        <span>
                          <Layers size={14} aria-hidden="true" />
                          {pluralize(posts, 'publicación', 'publicaciones')}
                        </span>
                        <span>
                          <FileText size={14} aria-hidden="true" />
                          {pluralize(docs, 'documento', 'documentos')}
                        </span>
                      </span>
                      <span className="section-card__go">
                        Ver apartado <ArrowRight size={16} aria-hidden="true" />
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        )}
      </div>
    </>
  )
}
