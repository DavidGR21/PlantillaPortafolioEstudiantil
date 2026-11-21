import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CircleCheck,
  CloudUpload,
  FileText,
  FolderTree,
  LayoutDashboard,
  LogIn,
  Palette,
  Share2,
  ShieldCheck,
  UserRoundCheck,
} from 'lucide-react'
import { Logo } from '../../components/brand/Logo.jsx'
import { useAuth } from '../../hooks/useAuth.js'
import { homePathFor } from '../../utils/redirect.js'
import heroIllustration from '../../assets/illustrations/hero-portfolio.svg'
import folderIllustration from '../../assets/illustrations/folder-documents.svg'
import './HomePage.css'

const FEATURES = [
  {
    icon: FolderTree,
    title: 'Organización por materias',
    text: 'Crea un apartado para cada asignatura y divídelo en parciales. Tú decides el orden.',
  },
  {
    icon: FileText,
    title: 'PDF e imágenes integrados',
    text: 'Tus documentos se visualizan directamente en la página, sin descargas ni programas extra.',
  },
  {
    icon: Share2,
    title: 'Un enlace para compartir',
    text: 'Cada portafolio tiene su propia dirección pública, lista para enviar a tus docentes.',
  },
  {
    icon: Palette,
    title: 'Con tu propio estilo',
    text: 'Elige el color de tu portafolio y añade una presentación que hable de ti.',
  },
]

const STEPS = [
  {
    icon: UserRoundCheck,
    title: 'Recibe tu acceso',
    text: 'El administrador de tu institución crea tu cuenta y te entrega tus credenciales.',
  },
  {
    icon: CloudUpload,
    title: 'Organiza tus trabajos',
    text: 'Crea apartados, parciales y publicaciones, y adjunta tus PDF e imágenes.',
  },
  {
    icon: Share2,
    title: 'Comparte tu enlace',
    text: 'Envía la dirección de tu portafolio a quien quieras. Siempre estará actualizado.',
  },
]

const HIGHLIGHTS = ['PDF e imágenes', 'Enlace público propio', 'Acceso seguro']

const CURRENT_YEAR = new Date().getFullYear()

/** Botón principal: «Iniciar sesión» o «Ir a mi panel» según haya sesión. */
function AccessButton({ user, className = '' }) {
  return user ? (
    <Link className={`btn-brand ${className}`} to={homePathFor(user)}>
      <LayoutDashboard size={18} aria-hidden="true" />
      Ir a mi panel
    </Link>
  ) : (
    <Link className={`btn-brand ${className}`} to="/login">
      <LogIn size={18} aria-hidden="true" />
      Iniciar sesión
    </Link>
  )
}

export default function HomePage() {
  const { user, isLoading } = useAuth()

  return (
    <div className="landing">
      {/* ---------- Barra superior ---------- */}
      <header className="landing-nav">
        <div className="landing-nav__inner">
          <Link to="/" className="landing-nav__brand" aria-label="Portafolio Académico, inicio">
            <Logo size={38} />
          </Link>
          <nav className="landing-nav__links" aria-label="Secciones">
            <a href="#caracteristicas">Características</a>
            <a href="#como-funciona">Cómo funciona</a>
          </nav>
          <div className="landing-nav__actions">
            {!isLoading && <AccessButton user={user} className="btn-brand--sm" />}
          </div>
        </div>
      </header>

      <main>
        {/* ---------- Portada ---------- */}
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero__inner">
            <div className="hero__content">
              <p className="eyebrow">
                <span className="eyebrow__dot" aria-hidden="true" />
                Plataforma de portafolios académicos
              </p>
              <h1 id="hero-title" className="hero__title">
                Tu trayectoria académica, presentada con <em>elegancia</em>
              </h1>
              <p className="hero__lead">
                Reúne tus trabajos, proyectos y evaluaciones en un portafolio digital ordenado por
                materias y parciales. Publícalo con un enlace propio y compártelo con tus docentes en
                segundos.
              </p>
              <div className="hero__actions">
                {!isLoading && <AccessButton user={user} />}
                <a className="btn-outline" href="#como-funciona">
                  Cómo funciona
                  <ArrowRight size={18} aria-hidden="true" />
                </a>
              </div>
              <ul className="hero__highlights">
                {HIGHLIGHTS.map((item) => (
                  <li key={item}>
                    <CircleCheck size={18} aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="hero__visual">
              <img
                src={heroIllustration}
                alt="Vista de un portafolio académico con apartados, documentos PDF e imágenes"
                width="584"
                height="448"
                fetchPriority="high"
              />
            </div>
          </div>
        </section>

        {/* ---------- Características ---------- */}
        <section id="caracteristicas" className="section" aria-labelledby="features-title">
          <div className="section__header">
            <p className="eyebrow">
              <span className="eyebrow__dot" aria-hidden="true" />
              Características
            </p>
            <h2 id="features-title" className="section__title">
              Todo lo que necesitas para mostrar tu trabajo
            </h2>
            <p className="section__lead">
              Una herramienta pensada para estudiantes: sencilla de usar y cuidada en cada detalle.
            </p>
          </div>

          <ul className="features">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="feature">
                <span className="feature__icon" aria-hidden="true">
                  <Icon size={24} strokeWidth={1.75} />
                </span>
                <h3 className="feature__title">{title}</h3>
                <p className="feature__text">{text}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* ---------- Cómo funciona ---------- */}
        <section id="como-funciona" className="section section--tinted" aria-labelledby="steps-title">
          <div className="steps-layout">
            <div className="steps-layout__visual">
              <img
                src={folderIllustration}
                alt="Carpeta con trabajos académicos organizados"
                width="420"
                height="340"
                loading="lazy"
              />
            </div>

            <div>
              <p className="eyebrow">
                <span className="eyebrow__dot" aria-hidden="true" />
                Cómo funciona
              </p>
              <h2 id="steps-title" className="section__title">
                Tres pasos para publicar tu portafolio
              </h2>
              <ol className="steps">
                {STEPS.map(({ icon: Icon, title, text }, index) => (
                  <li key={title} className="step">
                    <span className="step__icon" aria-hidden="true">
                      <Icon size={22} strokeWidth={1.75} />
                      <span className="step__number">{index + 1}</span>
                    </span>
                    <div>
                      <h3 className="step__title">{title}</h3>
                      <p className="step__text">{text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* ---------- Llamada final ---------- */}
        <section className="cta" aria-labelledby="cta-title">
          <div className="cta__inner">
            <ShieldCheck className="cta__icon" size={36} strokeWidth={1.5} aria-hidden="true" />
            <h2 id="cta-title" className="cta__title">
              Empieza a construir tu portafolio hoy
            </h2>
            <p className="cta__text">
              Tus archivos se guardan de forma privada y se muestran con enlaces seguros. ¿Aún no
              tienes cuenta? Solicítala al administrador de tu institución.
            </p>
            {!isLoading && <AccessButton user={user} className="btn-brand--light" />}
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-footer__inner">
          <Logo size={32} />
          <p>© {CURRENT_YEAR} Portafolio Académico. Trabajos académicos, bien presentados.</p>
        </div>
      </footer>
    </div>
  )
}
