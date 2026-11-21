import { useCallback, useEffect, useState } from 'react'
import { listActions } from '../services/adminService.js'
import { useDebouncedValue } from './useDebouncedValue.js'

/**
 * Bitácora con filtros y «Cargar más».
 * Devuelve { actions, hasMore, isLoading, isLoadingMore, error, loadMore }.
 */
export function useAdminActions({ targetType, action, search }) {
  const q = useDebouncedValue(search.trim(), 300)
  const key = `${targetType}|${action}|${q}`
  const [result, setResult] = useState(null) // { key, actions, nextCursor, error }
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [loadMoreError, setLoadMoreError] = useState(null)

  // Primera página (se repite al cambiar los filtros).
  useEffect(() => {
    const controller = new AbortController()
    const currentKey = `${targetType}|${action}|${q}`
    listActions({ targetType, action, q }, { signal: controller.signal })
      .then(({ actions, nextCursor }) => setResult({ key: currentKey, actions, nextCursor, error: null }))
      .catch((error) => {
        if (error.name !== 'AbortError') setResult({ key: currentKey, actions: [], nextCursor: null, error })
      })
    return () => controller.abort()
  }, [targetType, action, q])

  const loadMore = useCallback(async () => {
    if (!result?.nextCursor || result.key !== key) return
    setIsLoadingMore(true)
    setLoadMoreError(null)
    try {
      const page = await listActions({ targetType, action, q }, { before: result.nextCursor })
      setResult((current) =>
        current.key === key
          ? { ...current, actions: [...current.actions, ...page.actions], nextCursor: page.nextCursor }
          : current,
      )
    } catch (error) {
      setLoadMoreError(error)
    } finally {
      setIsLoadingMore(false)
    }
  }, [result, key, targetType, action, q])

  const isStale = result !== null && result.key !== key
  return {
    actions: result?.actions ?? [],
    hasMore: Boolean(result?.nextCursor) && !isStale,
    isLoading: result === null,
    isFiltering: isStale,
    isLoadingMore,
    error: result?.error ?? loadMoreError,
    loadMore,
  }
}
