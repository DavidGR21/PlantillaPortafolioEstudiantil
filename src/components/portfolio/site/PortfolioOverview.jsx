import { Link } from 'react-router-dom'
import { ArrowRight, ChevronDown, FileText, FolderOpen, Layers, PenLine } from 'lucide-react'
import { pluralize } from '../../../utils/format.js'
import { heroImageStyle } from './heroStyle.js'

/** Página de inicio del portafolio: portada con imagen, carátula, presentación y apartados. */
export function PortfolioOverview({ portfolio, sections, canEdit }) {
  const base = `/p/${portfolio.slug}`
  const cover = portfolio.coverInfo ?? {}
  const hasCaratula = Boolean(cover.institution || cover.subtitle || cover.fields?.length)

  return (
    <>
      <header
        className={`site-hero site-hero--home${portfolio.coverUrl ? ' site-hero--image' : ''}`}
        style={heroImageStyle(portfolio.coverUrl)}
      >
        <div className="site-hero__inner">
          <p className="site-hero__eyebrow">Portafolio académico</p>
          <h1 className="site-hero__title">
            <span>{portfolio.title}</span>
          </h1>
          {portfolio.subtitle && <p className="site-hero__subtitle">{portfolio.subtitle}</p>}
          <a className="site-hero__scroll" href={hasCaratula ? '#caratula' : '#apartados'}>
            <ChevronDown size={18} aria-hidden="true" />
            {hasCaratula ? 'Ver carátula' : 'Ver apartados'}
          </a>
        </div>
      </header>

      {hasCaratula && (
        <section id="caratula" className="caratula" aria-label="Carátula">
          <div className="caratula__sheet">
            {cover.institution && <h2 className="caratula__institution">{cover.institution}</h2>}
            {cover.subtitle && <p className="caratula__subtitle">{cover.subtitle}</p>}
            <span className="caratula__divider" aria-hidden="true" />
            {cover.fields?.length > 0 && (
              <dl className="caratula__fields">
                {cover.fields.map((field, i) => (
                  <div key={i} className="caratula__field">
                    {field.label && <dt>{field.label}</dt>}
                    <dd>{field.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </section>
      )}

      <div className="site-content" id="apartados">
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
                      <span className="section-card__cover" style={heroImageStyle(section.coverUrl)} aria-hidden="true">
                        <span className="section-card__number">{String(i + 1).padStart(2, '0')}</span>
                      </span>
                      <span className="section-card__body">
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
