/**
 * Carga PDF.js bajo demanda (solo cuando hay un PDF que mostrar), para no
 * aumentar el peso del resto del sitio. El worker se sirve desde el propio
 * dominio, así que cumple la CSP (script-src 'self').
 */
let pdfjsPromise = null

export function loadPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')]).then(
      ([pdfjs, worker]) => {
        pdfjs.GlobalWorkerOptions.workerSrc = worker.default
        return pdfjs
      },
    )
  }
  return pdfjsPromise
}

/**
 * Abre un PDF desde una URL firmada del bucket.
 * - Se descarga completo (sin peticiones por rangos): el CORS del bucket solo
 *   permite la cabecera Content-Type y los trabajos académicos son ligeros.
 * - Sin WebAssembly: la CSP no permite compilarlo (afecta solo a imágenes JPX/JBIG2 poco comunes).
 */
export async function openPdf(url) {
  const pdfjs = await loadPdfjs()
  return pdfjs.getDocument({
    url,
    disableRange: true,
    disableStream: true,
    disableAutoFetch: true,
    useWasm: false,
  })
}
