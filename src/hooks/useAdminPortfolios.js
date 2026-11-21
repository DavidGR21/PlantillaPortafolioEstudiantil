import { useCallback, useEffect, useState } from 'react'
import { listPortfolios } from '../services/adminService.js'
import { useDebouncedValue } from './useDebouncedValue.js'

/**
 * Todos los portafolios (administración) con búsqueda y filtro de estado.
 * Devuelve { portfolios, isLoading, isSearching, error, reload }.
 */
export function useAdminPortfolios(search, status) {
  const q = useDebouncedValue(search.trim(), 300)
  const key = `${status}|${q}`
  const [result, setResult] = useState(null) // { key, portfolios, error }

  useEffect(() => {
    const controller = new AbortController()
    listPortfolios({ q, status }, controller.signal)
      .then((portfolios) => setResult({ key: `${status}|${q}`, portfolios, error: null }))
      .catch((error) => {
        if (error.name !== 'AbortError') setResult({ key: `${status}|${q}`, portfolios: [], error })
      })
    return () => controller.abort()
  }, [q, status])

  const reload = useCallback(async () => {
    const portfolios = await listPortfolios({ q, status })
    setResult({ key: `${status}|${q}`, portfolios, error: null })
  }, [q, status])

  return {
    portfolios: result?.portfolios ?? [],
    isLoading: result === null,
    isSearching: result !== null && result.key !== key,
    error: result?.error ?? null,
    reload,
  }
}
