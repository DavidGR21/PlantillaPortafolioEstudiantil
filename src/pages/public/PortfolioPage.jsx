import { useEffect, useState } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { Eye, FolderOpen, Layers } from 'lucide-react'
import { PortfolioSkeleton } from '../../components/portfolio/PortfolioSkeleton.jsx'
import { DocumentRow } from '../../components/portfolio/site/DocumentRow.jsx'
import { buildPages } from '../../components/portfolio/site/pages.js'
import { PagerNav } from '../../components/portfolio/site/PagerNav.jsx'
import { PortfolioOverview } from '../../components/portfolio/site/PortfolioOverview.jsx'
import { PortfolioSidebar } from '../../components/portfolio/site/PortfolioSidebar.jsx'
import { SectionHero } from '../../components/portfolio/site/SectionHero.jsx'
import { SiteFooter } from '../../components/portfolio/site/SiteFooter.jsx'
import { StatusMessage } from '../../components/ui/StatusMessage.jsx'
import { usePublicPortfolio } from '../../hooks/usePublicPortfolio.js'
import { themeToStyle } from '../../utils/theme.js'
import '../../components/portfolio/Portfolio.css'

/** Vista pública del portafolio: /p/:slug (inicio) y /p/:slug/:apartado?parcial=… */
export default function PortfolioPage() {
  const { slug, sectionSlug } = useParams()
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const { data, error, isLoading } = usePublicPortfolio(slug)
  const [menuOpen, setMenuOpen] = useState(false)

  // Al cambiar de página: arriba del todo y menú móvil cerrado.
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [location.pathname, location.search])

  const title = data?.portfolio.title
  useEffect(() => {
    if (!title) return
    const previous = document.title
    document.title = title
    return () => {
      document.title = previous
    }
  }, [title])

  if (isLoading) return <PortfolioSkeleton />

  if (error) {
    if (error.code === 'PORTFOLIO_UNAVAILABLE') {
      return <StatusMessage title="Portafolio no disponible" message="Este portafolio no está disponible en este momento." />
    }
    if (error.status === 404) {
      return <StatusMessage code="404" title="Portafolio no encontrado" message="Revisa que el enlace esté bien escrito." />
    }
    return (
      <StatusMessage
        title="No se pudo cargar el portafolio"
        message={`${error.message} Recarga la página para intentarlo de nuevo.`}
      />
    )
  }

  const { portfolio, sections, viewer } = data
  const section = sectionSlug ? sections.find((s) => s.slug === sectionSlug) : null
  const subsection = section
    ? (section.subsections.find((s) => s.id === searchParams.get('parcial')) ?? section.subsections[0] ?? null)
    : null
  const pages = buildPages(portfolio, sections)

  return (
    <div className="site" style={themeToStyle(portfolio.theme)}>
      <PortfolioSidebar
        portfolio={portfolio}
        sections={sections}
        activeSectionId={section?.id}
        activeSubId={subsection?.id}
        canEdit={viewer.canEdit}
        open={menuOpen}
        onToggle={() => setMenuOpen((v) => !v)}
        onNavigate={() => setMenuOpen(false)}
      />

      <main className="site-main" id="contenido">
        {viewer.preview && (
          <p className="site-preview" role="status">
            <Eye size={16} aria-hidden="true" />
            {!viewer.canEdit
              ? 'Vista de administrador: este portafolio no es visible para el público.'
              : portfolio.status === 'blocked'
                ? 'Este portafolio está bloqueado por un administrador: solo tú puedes verlo.'
                : 'Este portafolio no es visible públicamente en este momento.'}
          </p>
        )}

        {!sectionSlug && <PortfolioOverview portfolio={portfolio} sections={sections} canEdit={viewer.canEdit} />}

        {sectionSlug && !section && (
          <div className="site-content">
            <div className="site-empty">
              <FolderOpen size={32} aria-hidden="true" />
              <h2>El apartado «{sectionSlug}» no existe</h2>
              <Link className="btn btn--ghost" to={`/p/${portfolio.slug}`}>
                Ir al inicio del portafolio
              </Link>
            </div>
          </div>
        )}

        {section && (
          <>
            <SectionHero portfolio={portfolio} section={section} subsection={subsection} />

            {!subsection && (
              <div className="site-content">
                <div className="site-empty">
                  <Layers size={30} aria-hidden="true" />
                  <h2>Este apartado aún no tiene contenido</h2>
                </div>
              </div>
            )}

            {subsection && subsection.posts.length === 0 && (
              <div className="site-content">
                <div className="site-empty">
                  <Layers size={30} aria-hidden="true" />
                  <h2>Todavía no hay publicaciones en {subsection.title}</h2>
                </div>
              </div>
            )}

            {subsection?.posts.map((post, index) => (
              <DocumentRow key={post.id} post={post} index={index} />
            ))}

            <div className="site-content site-content--pager">
              <PagerNav pages={pages} currentKey={subsection?.id ?? section.id} />
            </div>
          </>
        )}

        <SiteFooter portfolio={portfolio} sections={sections} />
      </main>
    </div>
  )
}
