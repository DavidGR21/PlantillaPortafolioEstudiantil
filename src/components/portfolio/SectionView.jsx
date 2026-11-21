import { useSearchParams } from 'react-router-dom'
import { PostCard } from './PostCard.jsx'

/**
 * Un apartado con sus submódulos (Parcial 1, Parcial 2...) como pestañas.
 * El submódulo activo va en la URL (?parcial=<id>) para poder compartir el enlace.
 */
export function SectionView({ section }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const { subsections } = section

  const requestedId = searchParams.get('parcial')
  const active = subsections.find((s) => s.id === requestedId) ?? subsections[0]

  function selectSubsection(id) {
    setSearchParams({ parcial: id }, { replace: true })
  }

  return (
    <section className="pf-section" aria-labelledby="pf-section-title">
      <h2 id="pf-section-title" className="pf-section__title">
        {section.title}
      </h2>

      {subsections.length === 0 && (
        <p className="pf-empty">Este apartado aún no tiene contenido.</p>
      )}

      {subsections.length > 1 && (
        <div className="pf-tabs" role="tablist" aria-label={`Submódulos de ${section.title}`}>
          {subsections.map((sub) => (
            <button
              key={sub.id}
              type="button"
              role="tab"
              id={`tab-${sub.id}`}
              aria-selected={sub.id === active.id}
              aria-controls={`panel-${sub.id}`}
              className={`pf-tabs__tab${sub.id === active.id ? ' pf-tabs__tab--active' : ''}`}
              onClick={() => selectSubsection(sub.id)}
            >
              {sub.title}
            </button>
          ))}
        </div>
      )}

      {active && (
        <div
          className="pf-subsection"
          role={subsections.length > 1 ? 'tabpanel' : undefined}
          id={`panel-${active.id}`}
          aria-labelledby={subsections.length > 1 ? `tab-${active.id}` : undefined}
        >
          {subsections.length === 1 && <h3 className="pf-subsection__title">{active.title}</h3>}

          {active.posts.length === 0 ? (
            <p className="pf-empty">Todavía no hay publicaciones en {active.title}.</p>
          ) : (
            <div className="pf-posts">
              {active.posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
