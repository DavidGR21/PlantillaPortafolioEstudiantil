import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight } from 'lucide-react'

/** «Anterior / Siguiente» al final de la página, cruzando apartados. */
export function PagerNav({ pages, currentKey }) {
  const index = pages.findIndex((p) => p.key === currentKey)
  if (index === -1 || pages.length < 2) return null
  const prev = pages[index - 1]
  const next = pages[index + 1]

  return (
    <nav className="site-pager" aria-label="Navegación entre parciales">
      {prev ? (
        <Link to={prev.to} className="site-pager__link">
          <ArrowLeft size={20} aria-hidden="true" />
          <span>
            <span className="site-pager__label">Anterior · {prev.context}</span>
            <span className="site-pager__title">{prev.title}</span>
          </span>
        </Link>
      ) : (
        <span />
      )}
      {next && (
        <Link to={next.to} className="site-pager__link site-pager__link--next">
          <span>
            <span className="site-pager__label">Siguiente · {next.context}</span>
            <span className="site-pager__title">{next.title}</span>
          </span>
          <ArrowRight size={20} aria-hidden="true" />
        </Link>
      )}
    </nav>
  )
}
