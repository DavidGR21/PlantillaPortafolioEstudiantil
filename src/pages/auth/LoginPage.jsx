import { useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.js'
import { FullPageLoader, Spinner } from '../../components/ui/Spinner.jsx'
import { homePathFor, safeNextPath } from '../../utils/redirect.js'
import './LoginPage.css'

export default function LoginPage() {
  const { user, isLoading, login } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const next = safeNextPath(searchParams.get('next'))

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (isLoading) return <FullPageLoader />

  // Si ya hay sesión (y no se está enviando el formulario), no tiene sentido mostrar el login.
  if (user && !isSubmitting) return <Navigate to={next || homePathFor(user)} replace />

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      const loggedUser = await login(email, password)
      navigate(next || homePathFor(loggedUser), { replace: true })
    } catch (err) {
      setError(err.message)
      setIsSubmitting(false)
    }
  }

  return (
    <main className="login">
      <section className="login__card" aria-labelledby="login-title">
        <h1 id="login-title" className="login__title">
          Iniciar sesión
        </h1>
        <p className="login__subtitle">
          {next ? 'Inicia sesión para continuar.' : 'Accede para editar tus portafolios.'}
        </p>

        <form className="login__form" onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="email">Correo electrónico</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="field">
            <label htmlFor="password">Contraseña</label>
            <div className="field__with-action">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="field__action"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
          </div>

          {error && (
            <p className="alert alert--error" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="btn btn--primary btn--block"
            disabled={isSubmitting || !email || !password}
          >
            {isSubmitting ? <Spinner size="sm" label="Ingresando…" /> : 'Ingresar'}
          </button>
        </form>

        <p className="login__footer">
          ¿No tienes cuenta? Solicítala al administrador.
          <br />
          <Link to="/">Volver al inicio</Link>
        </p>
      </section>
    </main>
  )
}
