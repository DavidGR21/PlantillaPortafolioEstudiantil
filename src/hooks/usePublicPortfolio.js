import { useCallback, useEffect, useState } from 'react'
import { getPublicPortfolio } from '../services/publicService.js'

/**
 * Carga el portafolio por slug (vista pública y editor).
 * Devuelve { data, error, isLoading, reload }.
 * - Al cambiar de slug vuelve a "cargando".
 * - reload() vuelve a pedir los datos sin ocultar los actuales y devuelve una
 *   promesa que se resuelve cuando ya están en pantalla (lanza si falla).
 */
export function usePublicPortfolio(slug) {
  const [result, setResult] = useState(null) // { slug, data, error }

  useEffect(() => {
    const controller = new AbortController()
    getPublicPortfolio(slug, controller.signal)
      .then((data) => setResult({ slug, data, error: null }))
      .catch((error) => {
        if (error.name !== 'AbortError') setResult({ slug, data: null, error })
      })
    return () => controller.abort()
  }, [slug])

  const reload = useCallback(async () => {
    const data = await getPublicPortfolio(slug)
    setResult({ slug, data, error: null })
  }, [slug])

  if (result?.slug !== slug) return { data: null, error: null, isLoading: true, reload }
  return { data: result.data, error: result.error, isLoading: false, reload }
}
