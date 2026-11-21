import { Link } from 'react-router-dom'
import { ChevronRight, FileText, Layers } from 'lucide-react'
import { pluralize } from '../../../utils/format.js'

/**
 * Portada del apartado: nombre del apartado, título grande del parcial con
 * subrayado de acento y pestañas para cambiar de parcial.
 */
export function SectionHero({ portfolio, section, subsection }) {
  const base = `/p/${portfolio.slug}/${section.slug}`
  const posts = subsection?.posts ?? []
  const docs = posts.reduce((n, p) => n + p.files.length, 0)

  return (
    <header className="site-hero">
      <div className="site-hero__inner">
        <nav className="site-hero__crumbs" aria-label="Ruta">
          <Link to={`/p/${portfolio.slug}`}>{portfolio.title}</Link>
          <ChevronRight size={14} aria-hidden="true" />
          <span>{section.title}</span>
        </nav>

        <h1 className="site-hero__title">
          <span>{subsection ? subsection.title : section.title}</span>
        </h1>

        {subsection && (
          <p className="site-hero__meta">
            <span>
              <Layers size={15} aria-hidden="true" />
              {pluralize(posts.length, 'publicación', 'publicaciones')}
            </span>
            <span>
              <FileText size={15} aria-hidden="true" />
              {pluralize(docs, 'documento', 'documentos')}
            </span>
          </p>
        )}

        {section.subsections.length > 1 && (
          <nav className="site-hero__tabs" aria-label={`Parciales de ${section.title}`}>
            {section.subsections.map((sub) => {
              const active = sub.id === subsection?.id
              return (
                <Link
                  key={sub.id}
                  to={`${base}?parcial=${sub.id}`}
                  className={`site-hero__tab${active ? ' site-hero__tab--active' : ''}`}
                  aria-current={active ? 'page' : undefined}
                  replace
                >
                  {sub.title}
                </Link>
              )
            })}
          </nav>
        )}
      </div>
    </header>
  )
}
