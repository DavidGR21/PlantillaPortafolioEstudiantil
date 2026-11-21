import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.js'
import { homePathFor } from '../../utils/redirect.js'
import './HomePage.css'

const FEATURES = [
  {
    icon: '🗂️',
    title: 'Organizado a tu manera',
    text: 'Crea apartados para cada materia y divídelos en parciales. Tú decides el orden.',
  },
  {
    icon: '📄',
    title: 'PDF e imágenes',
    text: 'Sube tus trabajos y se verán directamente en la página, sin descargar nada.',
  },
  {
    icon: '🔗',
    title: 'Tu propio enlace',
    text: 'Cada portafolio tiene una dirección para compartir con tus profesores.',
  },
]

export default function HomePage() {
  const { user, isLoading } = useAuth()

  return (
    <div className="home">
      <header className="home__bar">
        <span className="home__brand">Portafolio Académico</span>
        {!isLoading &&
          (user ? (
            <Link className="btn btn--ghost btn--sm" to={homePathFor(user)}>
              Ir a mi panel
            </Link>
          ) : (
            <Link className="btn btn--ghost btn--sm" to="/login">
              Iniciar sesión
            </Link>
          ))}
      </header>

      <main>
        <section className="home__hero">
          <h1 className="home__title">Tus trabajos académicos, en un solo lugar</h1>
          <p className="home__text">
            Publica tus tareas, proyectos y exámenes organizados por materias y parciales, y
            compártelos con un enlace propio.
          </p>
          {!isLoading &&
            (user ? (
              <Link className="btn btn--primary home__cta" to={homePathFor(user)}>
                Ir a mi panel
              </Link>
            ) : (
              <Link className="btn btn--primary home__cta" to="/login">
                Iniciar sesión
              </Link>
            ))}
          <p className="home__note">¿Aún no tienes cuenta? Pídela a tu administrador.</p>
        </section>

        <section className="home__features" aria-label="Características">
          {FEATURES.map((feature) => (
            <article key={feature.title} className="home__feature">
              <span className="home__feature-icon" aria-hidden="true">
                {feature.icon}
              </span>
              <h2>{feature.title}</h2>
              <p>{feature.text}</p>
            </article>
          ))}
        </section>
      </main>

      <footer className="home__footer">Portafolio Académico</footer>
    </div>
  )
}
