import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { FullPageLoader } from '../../components/ui/Spinner.jsx'
import { StatusMessage } from '../../components/ui/StatusMessage.jsx'
import { PortfolioHeader } from '../../components/portfolio/PortfolioHeader.jsx'
import { PortfolioNav } from '../../components/portfolio/PortfolioNav.jsx'
import { SectionView } from '../../components/portfolio/SectionView.jsx'
import { usePublicPortfolio } from '../../hooks/usePublicPortfolio.js'
import { themeToStyle } from '../../utils/theme.js'
import '../../components/portfolio/Portfolio.css'

export default function PortfolioPage() {
  const { slug, sectionSlug } = useParams()
  const { data, error, isLoading } = usePublicPortfolio(slug)

  const title = data?.portfolio.title
  useEffect(() => {
    if (!title) return
    const previous = document.title
    document.title = title
    return () => {
      document.title = previous
    }
  }, [title])

  if (isLoading) return <FullPageLoader label="Cargando portafolio…" />

  if (error) {
    if (error.code === 'PORTFOLIO_UNAVAILABLE') {
      return (
        <StatusMessage
          title="Portafolio no disponible"
          message="Este portafolio no está disponible en este momento."
        />
      )
    }
    if (error.status === 404) {
      return (
        <StatusMessage
          code="404"
          title="Portafolio no encontrado"
          message="Revisa que el enlace esté bien escrito."
        />
      )
    }
    return (
      <StatusMessage
        title="No se pudo cargar el portafolio"
        message={`${error.message} Recarga la página para intentarlo de nuevo.`}
      />
    )
  }

  const { portfolio, sections, viewer } = data
  // Sin apartado en la URL se muestra el primero.
  const section = sectionSlug ? sections.find((s) => s.slug === sectionSlug) : sections[0]

  return (
    <div className="pf" style={themeToStyle(portfolio.theme)}>
      {viewer.preview && (
        <p className="pf-preview-banner" role="status">
          {!viewer.canEdit
            ? 'Vista de administrador: este portafolio no es visible para el público.'
            : portfolio.status === 'blocked'
              ? 'Este portafolio está bloqueado por un administrador: solo tú puedes verlo.'
              : 'Este portafolio no es visible públicamente en este momento.'}
        </p>
      )}

      <PortfolioHeader portfolio={portfolio} canEdit={viewer.canEdit} />
      <PortfolioNav slug={portfolio.slug} sections={sections} activeSectionId={section?.id} />

      <main className="pf-main">
        {sections.length === 0 && (
          <div className="pf-empty pf-empty--large">
            <p>Este portafolio aún no tiene contenido.</p>
            {viewer.canEdit && (
              <Link className="btn btn--primary" to={`/p/${portfolio.slug}/editar`}>
                Agregar el primer apartado
              </Link>
            )}
          </div>
        )}

        {sections.length > 0 && !section && (
          <div className="pf-empty pf-empty--large">
            <p>El apartado «{sectionSlug}» no existe.</p>
            <Link className="btn btn--ghost" to={`/p/${portfolio.slug}`}>
              Ir al inicio del portafolio
            </Link>
          </div>
        )}

        {section && <SectionView key={section.id} section={section} />}
      </main>

      <footer className="pf-footer">
        <span>{portfolio.ownerName}</span>
        <Link to="/">Portafolio Académico</Link>
      </footer>
    </div>
  )
}
