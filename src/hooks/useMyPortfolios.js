import { useCallback, useEffect, useState } from 'react'
import { listMyPortfolios } from '../services/portfolioService.js'

/**
 * Portafolios del usuario con sesión.
 * Devuelve { portfolios, count, limit, isLoading, error, reload }.
 */
export function useMyPortfolios() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    listMyPortfolios(controller.signal)
      .then((result) => {
        setData(result)
        setError(null)
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err)
      })
    return () => controller.abort()
  }, [reloadKey])

  const reload = useCallback(() => setReloadKey((k) => k + 1), [])

  return {
    portfolios: data?.portfolios ?? [],
    count: data?.count ?? 0,
    limit: data?.limit ?? 0,
    isLoading: data === null && error === null,
    error,
    reload,
  }
}
