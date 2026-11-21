import { useEffect, useState } from 'react'
import { useDebouncedValue } from './useDebouncedValue.js'
import { checkSlug } from '../services/portfolioService.js'
import { validateSlugFormat } from '../utils/slug.js'

/**
 * Comprueba (con retardo) si una dirección está libre.
 * status: 'idle' | 'invalid' | 'checking' | 'available' | 'taken' | 'error'
 * Si `skip` es true (p. ej. el slug no ha cambiado al editar) devuelve 'idle'.
 */
export function useSlugAvailability(slug, { excludeId, skip = false } = {}) {
  const formatError = validateSlugFormat(slug)
  const debouncedSlug = useDebouncedValue(slug, 400)
  const [result, setResult] = useState(null) // { slug, available, error }

  const shouldCheck = !skip && !formatError && debouncedSlug === slug

  useEffect(() => {
    if (!shouldCheck) return
    const controller = new AbortController()
    checkSlug(debouncedSlug, { excludeId, signal: controller.signal })
      .then((data) => setResult({ slug: debouncedSlug, available: data.available, error: data.error }))
      .catch((error) => {
        if (error.name === 'AbortError') return
        setResult({ slug: debouncedSlug, available: null, error: 'No se pudo comprobar la dirección' })
      })
    return () => controller.abort()
  }, [shouldCheck, debouncedSlug, excludeId])

  if (skip) return { status: 'idle', message: null }
  if (formatError) return { status: 'invalid', message: slug ? formatError : null }
  if (result?.slug !== slug) return { status: 'checking', message: 'Comprobando…' }
  if (result.available === null) return { status: 'error', message: result.error }
  return result.available
    ? { status: 'available', message: 'Dirección disponible' }
    : { status: 'taken', message: result.error || 'Esa dirección ya está en uso' }
}
