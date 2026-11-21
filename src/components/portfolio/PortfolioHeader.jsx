import { Link } from 'react-router-dom'

export function PortfolioHeader({ portfolio, canEdit }) {
  const initials = portfolio.ownerName
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('')

  return (
    <header className="pf-header">
      <div className="pf-header__inner">
        {portfolio.avatarUrl ? (
          <img className="pf-header__avatar" src={portfolio.avatarUrl} alt="" />
        ) : (
          <span className="pf-header__avatar pf-header__avatar--initials" aria-hidden="true">
            {initials}
          </span>
        )}

        <div className="pf-header__text">
          <h1 className="pf-header__title">{portfolio.title}</h1>
          {portfolio.subtitle && <p className="pf-header__subtitle">{portfolio.subtitle}</p>}
          <p className="pf-header__owner">{portfolio.ownerName}</p>
        </div>

        {canEdit && (
          <Link className="btn btn--primary btn--sm pf-header__edit" to={`/p/${portfolio.slug}/editar`}>
            Editar portafolio
          </Link>
        )}
      </div>

      {portfolio.description && <p className="pf-header__description">{portfolio.description}</p>}
    </header>
  )
}
