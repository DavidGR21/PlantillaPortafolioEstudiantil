import './Portfolio.css'

/** Esqueleto de carga con la misma forma que el portafolio (sin saltos al cargar). */
export function PortfolioSkeleton() {
  return (
    <div className="site" aria-busy="true">
      <span className="visually-hidden" role="status">
        Cargando portafolio…
      </span>
      <aside className="site-sidebar site-sidebar--skeleton" aria-hidden="true">
        <div className="site-sidebar__brand">
          <span className="site-monogram skeleton" />
          <div className="site-sidebar__brand-text">
            <span className="skeleton skeleton--text" style={{ width: '80%', height: '1rem' }} />
            <span className="skeleton skeleton--text" style={{ width: '55%' }} />
          </div>
        </div>
        {[70, 55, 80, 60].map((w, i) => (
          <span key={i} className="skeleton skeleton--text" style={{ width: `${w}%`, height: '1rem', margin: '1.1rem 0.75rem 0' }} />
        ))}
      </aside>
      <main className="site-main" aria-hidden="true">
        <div className="site-hero">
          <div className="site-hero__inner">
            <span className="skeleton skeleton--hero-crumb" />
            <span className="skeleton skeleton--hero-title" />
          </div>
        </div>
        {[0, 1].map((i) => (
          <div key={i} className={`doc-row${i === 1 ? ' doc-row--alt' : ''}`}>
            <div className="doc-row__inner">
              <div className="doc-row__info">
                <span className="skeleton skeleton--text" style={{ width: '35%' }} />
                <span className="skeleton skeleton--text" style={{ width: '75%', height: '1.6rem', marginTop: '0.75rem' }} />
                <span className="skeleton skeleton--text" style={{ width: '90%' }} />
                <span className="skeleton skeleton--text" style={{ width: '70%' }} />
              </div>
              <div className="doc-row__viewer">
                <span className="skeleton skeleton--viewer" />
              </div>
            </div>
          </div>
        ))}
      </main>
    </div>
  )
}
