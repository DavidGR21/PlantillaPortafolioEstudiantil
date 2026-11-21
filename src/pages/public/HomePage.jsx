import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.js'
import { homePathFor } from '../../utils/redirect.js'
import './HomePage.css'

export default function HomePage() {
  const { user, isLoading } = useAuth()

  return (
    <main className="home">
      <h1 className="home__title">Portafolio Académico</h1>
      <p className="home__text">
        Publica tus trabajos académicos (PDF e imágenes) organizados por materias y parciales, y
        compártelos con un enlace propio.
      </p>
      {!isLoading &&
        (user ? (
          <Link className="btn btn--primary" to={homePathFor(user)}>
            Ir a mi panel
          </Link>
        ) : (
          <Link className="btn btn--primary" to="/login">
            Iniciar sesión
          </Link>
        ))}
    </main>
  )
}
