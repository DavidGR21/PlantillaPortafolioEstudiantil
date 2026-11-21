import { useCallback, useEffect, useState } from 'react'
import { listUsers } from '../services/adminService.js'
import { useDebouncedValue } from './useDebouncedValue.js'

/**
 * Lista de usuarios para el administrador, con búsqueda (con retardo).
 * Devuelve { users, isLoading, error, reload }.
 */
export function useAdminUsers(search) {
  const query = useDebouncedValue(search.trim(), 300)
  const [result, setResult] = useState(null) // { query, users, error }

  useEffect(() => {
    const controller = new AbortController()
    listUsers(query, controller.signal)
      .then((users) => setResult({ query, users, error: null }))
      .catch((error) => {
        if (error.name !== 'AbortError') setResult({ query, users: [], error })
      })
    return () => controller.abort()
  }, [query])

  const reload = useCallback(async () => {
    const users = await listUsers(query)
    setResult({ query, users, error: null })
  }, [query])

  return {
    users: result?.users ?? [],
    isLoading: result === null,
    isSearching: result !== null && result.query !== query,
    error: result?.error ?? null,
    reload,
  }
}
