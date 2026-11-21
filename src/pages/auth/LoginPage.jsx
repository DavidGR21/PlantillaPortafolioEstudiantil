import { useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  CircleAlert,
  Eye,
  EyeOff,
  FolderTree,
  LoaderCircle,
  LockKeyhole,
  LogIn,
  Mail,
  Share2,
  ShieldCheck,
} from 'lucide-react'
import { Logo } from '../../components/brand/Logo.jsx'
import { FullPageLoader } from '../../components/ui/Spinner.jsx'
import { useAuth } from '../../hooks/useAuth.js'
import { homePathFor, safeNextPath } from '../../utils/redirect.js'
import './LoginPage.css'

const BENEFITS = [
  { icon: FolderTree, text: 'Organiza tus trabajos por materias y parciales' },
  { icon: Share2, text: 'Comparte tu portafolio con un enlace propio' },
  { icon: ShieldCheck, text: 'Tus archivos se guardan de forma privada y segura' },
]

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
    <div className="auth">
      {/* Fondo decorativo: da profundidad al efecto de vidrio */}
      <div className="auth__backdrop" aria-hidden="true">
        <span className="auth__orb auth__orb--rose" />
        <span className="auth__orb auth__orb--light" />
        <span className="auth__orb auth__orb--teal" />
        <span className="auth__grid" />
      </div>

      <header className="auth__top">
        <Link to="/" className="auth__back">
          <ArrowLeft size={18} aria-hidden="true" />
          Volver al inicio
        </Link>
      </header>

      <main className="auth__layout">
        {/* ---------- Columna de marca ---------- */}
        <section className="auth__brand" aria-label="Portafolio Académico">
          <Link to="/" className="auth__logo" aria-label="Portafolio Académico, inicio">
            <Logo size={44} variant="light" />
          </Link>
          <h1 className="auth__headline">
            Tu trabajo académico merece una <em>gran presentación</em>
          </h1>
          <p className="auth__lead">
            Accede a tu panel para organizar, actualizar y compartir tus portafolios.
          </p>
          <ul className="auth__benefits">
            {BENEFITS.map(({ icon: Icon, text }) => (
              <li key={text}>
                <span className="auth__benefit-icon" aria-hidden="true">
                  <Icon size={18} strokeWidth={1.9} />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </section>

        {/* ---------- Formulario (vidrio esmerilado) ---------- */}
        <section className="glass-card" aria-labelledby="login-title">
          <div className="glass-card__head">
            <span className="glass-card__badge" aria-hidden="true">
              <LogIn size={22} strokeWidth={1.9} />
            </span>
            <h2 id="login-title" className="glass-card__title">
              Iniciar sesión
            </h2>
            <p className="glass-card__subtitle">
              {next ? 'Inicia sesión para continuar.' : 'Ingresa con el correo y la contraseña de tu cuenta.'}
            </p>
          </div>

          <form className="glass-form" onSubmit={handleSubmit} noValidate>
            <div className="glass-field">
              <label htmlFor="email">Correo electrónico</label>
              <div className="glass-input">
                <Mail className="glass-input__icon" size={18} aria-hidden="true" />
                <input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="tu.correo@institucion.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={error ? 'true' : undefined}
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="glass-field">
              <label htmlFor="password">Contraseña</label>
              <div className="glass-input">
                <LockKeyhole className="glass-input__icon" size={18} aria-hidden="true" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={error ? 'true' : undefined}
                  required
                />
                <button
                  type="button"
                  className="glass-input__toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  aria-pressed={showPassword}
                  title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="glass-alert" role="alert">
                <CircleAlert size={18} aria-hidden="true" />
                <span>{error}</span>
              </p>
            )}

            <button type="submit" className="glass-submit" disabled={isSubmitting || !email || !password}>
              {isSubmitting ? (
                <>
                  <LoaderCircle className="glass-submit__spin" size={18} aria-hidden="true" />
                  Ingresando…
                </>
              ) : (
                <>
                  Ingresar
                  <LogIn size={18} aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          <p className="glass-card__footer">
            ¿No tienes cuenta? <strong>Solicítala al administrador</strong> de tu institución.
          </p>
        </section>
      </main>
    </div>
  )
}
