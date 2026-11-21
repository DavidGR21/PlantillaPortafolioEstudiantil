import { Link } from 'react-router-dom'

/** Menú de navegación con los apartados del portafolio. */
export function PortfolioNav({ slug, sections, activeSectionId }) {
  if (sections.length === 0) return null

  return (
    <nav className="pf-nav" aria-label="Apartados del portafolio">
      <ul className="pf-nav__list">
        {sections.map((section) => {
          const isActive = section.id === activeSectionId
          return (
            <li key={section.id}>
              <Link
                to={`/p/${slug}/${section.slug}`}
                className={`pf-nav__link${isActive ? ' pf-nav__link--active' : ''}`}
                aria-current={isActive ? 'page' : undefined}
              >
                {section.title}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
