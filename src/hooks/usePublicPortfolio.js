import { useCallback, useEffect, useState } from 'react'
import { getPublicPortfolio } from '../services/publicService.js'

// Los enlaces firmados de los archivos duran 2 h (api/_lib/storage.js).
// Se renuevan antes de que caduquen.
const REFRESH_AFTER_MS = 90 * 60 * 1000

/**
 * Carga el portafolio por slug (vista pública y editor).
 * Devuelve { data, error, isLoading, reload }.
 * - Al cambiar de slug vuelve a "cargando".
 * - reload() vuelve a pedir los datos sin ocultar los actuales y devuelve una
 *   promesa que se resuelve cuando ya están en pantalla (lanza si falla).
 * - Renueva los datos en segundo plano cada 90 min, y al volver a la pestaña
 *   si pasó más tiempo (los enlaces de los archivos caducan a las 2 h).
 */
export function usePublicPortfolio(slug) {
  const [result, setResult] = useState(null) // { slug, data, error, loadedAt }

  useEffect(() => {
    const controller = new AbortController()
    getPublicPortfolio(slug, controller.signal)
      .then((data) => setResult({ slug, data, error: null, loadedAt: Date.now() }))
      .catch((error) => {
        if (error.name !== 'AbortError') setResult({ slug, data: null, error, loadedAt: Date.now() })
      })
    return () => controller.abort()
  }, [slug])

  const reload = useCallback(async () => {
    const data = await getPublicPortfolio(slug)
    setResult({ slug, data, error: null, loadedAt: Date.now() })
  }, [slug])

  // Renovación silenciosa de los enlaces firmados.
  const loadedAt = result?.slug === slug && result.data ? result.loadedAt : null
  useEffect(() => {
    if (!loadedAt) return
    const refresh = () => reload().catch(() => {}) // si falla, se mantiene lo que hay
    const timer = setTimeout(refresh, Math.max(0, loadedAt + REFRESH_AFTER_MS - Date.now()))
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - loadedAt >= REFRESH_AFTER_MS) refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [loadedAt, reload])

  if (result?.slug !== slug) return { data: null, error: null, isLoading: true, reload }
  return { data: result.data, error: result.error, isLoading: false, reload }
}
