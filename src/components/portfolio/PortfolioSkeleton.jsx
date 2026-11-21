/**
 * Esqueleto de carga del portafolio público: misma forma que la página real,
 * así el contenido no "salta" cuando llega.
 */
export function PortfolioSkeleton() {
  return (
    <div className="pf" aria-busy="true">
      <span className="visually-hidden" role="status">
        Cargando portafolio…
      </span>
      <header className="pf-header">
        <div className="pf-header__inner">
          <span className="pf-header__avatar skeleton skeleton--circle" />
          <div className="pf-header__text">
            <span className="skeleton skeleton--title" />
            <span className="skeleton skeleton--text" style={{ width: '40%' }} />
          </div>
        </div>
      </header>
      <nav className="pf-nav" aria-hidden="true">
        <div className="pf-nav__list">
          {[6, 8, 5].map((w, i) => (
            <span key={i} className="skeleton skeleton--text pf-skeleton__tab" style={{ width: `${w}rem` }} />
          ))}
        </div>
      </nav>
      <main className="pf-main" aria-hidden="true">
        <span className="skeleton skeleton--title" style={{ width: '30%' }} />
        <div className="pf-posts">
          {[0, 1].map((i) => (
            <div key={i} className="pf-post">
              <span className="skeleton skeleton--text" style={{ width: '50%', height: '1.2rem' }} />
              <span className="skeleton skeleton--text" />
              <span className="skeleton skeleton--text" style={{ width: '80%' }} />
              <div className="pf-files__images" style={{ marginTop: '1rem' }}>
                <span className="skeleton skeleton--image" />
                <span className="skeleton skeleton--image" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
