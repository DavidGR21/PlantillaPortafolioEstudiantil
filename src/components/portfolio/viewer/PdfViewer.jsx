import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  FileWarning,
  LoaderCircle,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { openPdf } from './loadPdfjs.js'

const ZOOM_STEPS = [1, 1.25, 1.5, 2, 2.5, 3] // 1 = página completa visible
const SWIPE_THRESHOLD = 50

/** Se activa cuando el elemento está cerca de la pantalla (carga diferida). */
function useNearViewport(ref) {
  // Sin IntersectionObserver (navegadores muy antiguos) se carga de inmediato.
  const [near, setNear] = useState(() => typeof IntersectionObserver === 'undefined')
  useEffect(() => {
    const el = ref.current
    if (!el || near) return
    const observer = new IntersectionObserver(
      (entries) => entries.some((e) => e.isIntersecting) && setNear(true),
      { rootMargin: '400px 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref, near])
  return near
}

/**
 * Visor de PDF integrado (PDF.js): navegación por páginas, zoom, pantalla
 * completa, abrir y descargar. Funciona igual en escritorio y en móviles.
 */
export function PdfViewer({ url, downloadUrl, name }) {
  const rootRef = useRef(null)
  const stageRef = useRef(null)
  const canvasRef = useRef(null)
  const touchX = useRef(null)
  const near = useNearViewport(rootRef)

  const [doc, setDoc] = useState(null)
  const [status, setStatus] = useState('idle') // idle (cargando) | ready | error
  const [page, setPage] = useState(1)
  const [pageInput, setPageInput] = useState('1')
  const [zoomIndex, setZoomIndex] = useState(0)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [isRendering, setIsRendering] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const numPages = doc?.numPages ?? 0

  // 1) Cargar el documento cuando el visor se acerca a la pantalla.
  useEffect(() => {
    if (!near) return
    let cancelled = false
    let task = null
    // Mientras carga se muestra el estado «idle» como «Cargando…»; si cambia la URL
    // (enlace firmado renovado) se mantiene la página actual hasta tener la nueva.
    openPdf(url)
      .then((loadingTask) => {
        task = loadingTask
        return loadingTask.promise
      })
      .then((pdf) => {
        if (cancelled) return
        setDoc(pdf)
        setPage((p) => Math.min(p, pdf.numPages))
        setStatus('ready')
      })
      .catch((error) => {
        if (cancelled) return
        console.error('[PdfViewer]', error)
        setStatus('error')
      })
    return () => {
      cancelled = true
      task?.destroy()
    }
  }, [near, url])

  // 2) Medir el área disponible (cambia con la ventana o la pantalla completa).
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setSize((s) => (Math.abs(s.width - width) > 1 || Math.abs(s.height - height) > 1 ? { width, height } : s))
    })
    observer.observe(stage)
    return () => observer.disconnect()
  }, [])

  // 3) Dibujar la página actual.
  useEffect(() => {
    if (!doc || !size.width || !canvasRef.current) return
    let cancelled = false
    let renderTask = null
    setIsRendering(true)
    doc
      .getPage(page)
      .then((pdfPage) => {
        if (cancelled) return
        const base = pdfPage.getViewport({ scale: 1 })
        const padding = 24
        // Zoom 1 = la página entera cabe en el área; los siguientes niveles la agrandan.
        const fit = Math.min((size.width - padding) / base.width, (size.height - padding) / base.height)
        const scale = Math.max(fit, 0.1) * ZOOM_STEPS[zoomIndex]
        const viewport = pdfPage.getViewport({ scale })
        const ratio = window.devicePixelRatio || 1
        const canvas = canvasRef.current
        canvas.width = Math.floor(viewport.width * ratio)
        canvas.height = Math.floor(viewport.height * ratio)
        canvas.style.width = `${Math.floor(viewport.width)}px`
        canvas.style.height = `${Math.floor(viewport.height)}px`
        renderTask = pdfPage.render({
          canvasContext: canvas.getContext('2d'),
          viewport,
          transform: ratio !== 1 ? [ratio, 0, 0, ratio, 0, 0] : undefined,
        })
        return renderTask.promise
      })
      .then(() => !cancelled && setIsRendering(false))
      .catch((error) => {
        if (cancelled || error?.name === 'RenderingCancelledException') return
        console.error('[PdfViewer] render', error)
        setIsRendering(false)
      })
    return () => {
      cancelled = true
      renderTask?.cancel()
    }
  }, [doc, page, size, zoomIndex])

  // Pantalla completa (API del navegador)
  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement === rootRef.current)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const goTo = useCallback(
    (target) => {
      if (!numPages) return
      const next = Math.min(Math.max(1, target), numPages)
      setPage(next)
      setPageInput(String(next))
      if (stageRef.current) stageRef.current.scrollTop = 0
    },
    [numPages],
  )

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen()
    else rootRef.current?.requestFullscreen?.()
  }

  function handleKeyDown(event) {
    if (event.target.tagName === 'INPUT') return
    if (['ArrowRight', 'PageDown'].includes(event.key)) {
      event.preventDefault()
      goTo(page + 1)
    } else if (['ArrowLeft', 'PageUp'].includes(event.key)) {
      event.preventDefault()
      goTo(page - 1)
    }
  }

  // Deslizar con el dedo para cambiar de página (solo sin zoom, para no interferir con el desplazamiento).
  const onTouchStart = (e) => {
    touchX.current = zoomIndex === 0 ? e.touches[0].clientX : null
  }
  const onTouchEnd = (e) => {
    if (touchX.current === null) return
    const delta = e.changedTouches[0].clientX - touchX.current
    if (Math.abs(delta) > SWIPE_THRESHOLD) goTo(page + (delta < 0 ? 1 : -1))
    touchX.current = null
  }

  const zoomPercent = Math.round(ZOOM_STEPS[zoomIndex] * 100)

  return (
    <div
      ref={rootRef}
      className={`pdfv${isFullscreen ? ' pdfv--fullscreen' : ''}`}
      role="region"
      aria-label={`Documento PDF: ${name}`}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className="pdfv__toolbar">
        <div className="pdfv__group" role="group" aria-label="Páginas">
          <button type="button" className="pdfv__btn" onClick={() => goTo(page - 1)} disabled={page <= 1 || status !== 'ready'} aria-label="Página anterior" title="Página anterior">
            <ChevronLeft size={18} />
          </button>
          <form
            className="pdfv__page"
            onSubmit={(e) => {
              e.preventDefault()
              goTo(Number(pageInput) || page)
            }}
          >
            <input
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value.replace(/\D/g, ''))}
              onBlur={() => setPageInput(String(page))}
              inputMode="numeric"
              aria-label="Número de página"
              disabled={status !== 'ready'}
            />
            <span>de {numPages || '–'}</span>
          </form>
          <button type="button" className="pdfv__btn" onClick={() => goTo(page + 1)} disabled={page >= numPages || status !== 'ready'} aria-label="Página siguiente" title="Página siguiente">
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="pdfv__group" role="group" aria-label="Zoom">
          <button type="button" className="pdfv__btn" onClick={() => setZoomIndex((z) => Math.max(0, z - 1))} disabled={zoomIndex === 0 || status !== 'ready'} aria-label="Alejar" title="Alejar">
            <ZoomOut size={17} />
          </button>
          <span className="pdfv__zoom" aria-live="polite">
            {zoomPercent}%
          </span>
          <button type="button" className="pdfv__btn" onClick={() => setZoomIndex((z) => Math.min(ZOOM_STEPS.length - 1, z + 1))} disabled={zoomIndex === ZOOM_STEPS.length - 1 || status !== 'ready'} aria-label="Acercar" title="Acercar">
            <ZoomIn size={17} />
          </button>
        </div>

        <div className="pdfv__group pdfv__group--end">
          <button type="button" className="pdfv__btn" onClick={toggleFullscreen} aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'} title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}>
            {isFullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
          </button>
          <a className="pdfv__btn" href={url} target="_blank" rel="noreferrer" aria-label="Abrir en una pestaña nueva" title="Abrir en una pestaña nueva">
            <ExternalLink size={17} />
          </a>
          {downloadUrl && (
            <a className="pdfv__btn" href={downloadUrl} aria-label={`Descargar ${name}`} title="Descargar">
              <Download size={17} />
            </a>
          )}
        </div>
      </div>

      <div
        ref={stageRef}
        className={`pdfv__stage${zoomIndex > 0 ? ' pdfv__stage--zoomed' : ''}`}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <canvas ref={canvasRef} className={`pdfv__canvas${status === 'ready' ? '' : ' pdfv__canvas--hidden'}`} aria-label={`Página ${page} de ${numPages}`} role="img" />

        {status === 'idle' && (
          <div className="pdfv__state">
            <LoaderCircle className="pdfv__spin" size={28} aria-hidden="true" />
            <span>Cargando documento…</span>
          </div>
        )}
        {status === 'ready' && isRendering && (
          <LoaderCircle className="pdfv__spin pdfv__spin--corner" size={20} aria-label="Dibujando página" />
        )}
        {status === 'error' && (
          <div className="pdfv__state pdfv__state--error">
            <FileWarning size={30} aria-hidden="true" />
            <span>No se pudo mostrar la vista previa.</span>
            <a className="btn btn--primary btn--sm" href={url} target="_blank" rel="noreferrer">
              <ExternalLink size={15} aria-hidden="true" />
              Abrir el PDF
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
