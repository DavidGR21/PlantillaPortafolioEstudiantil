import { useEffect, useState } from 'react'
import { getPublicPortfolio } from '../services/publicService.js'

/**
 * Carga el portafolio público por slug.
 * Devuelve { data, error, isLoading }; al cambiar de slug vuelve a "cargando".
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

  if (result?.slug !== slug) return { data: null, error: null, isLoading: true }
  return { data: result.data, error: result.error, isLoading: false }
}
