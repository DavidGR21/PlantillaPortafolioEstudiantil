import { useCallback, useEffect, useMemo, useState } from 'react'
import { AuthContext } from './authContext.js'
import * as authService from '../services/authService.js'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  // Al cargar la app, pregunta al servidor si hay una sesión activa.
  useEffect(() => {
    const controller = new AbortController()
    authService
      .getCurrentUser(controller.signal)
      .then(setUser)
      .catch((error) => {
        if (error.name !== 'AbortError') setUser(null)
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })
    return () => controller.abort()
  }, [])

  /** Vuelve a leer la sesión (p. ej. tras cambiar datos del usuario). */
  const refresh = useCallback(async () => {
    try {
      setUser(await authService.getCurrentUser())
    } catch {
      setUser(null)
    }
  }, [])

  const login = useCallback(async (email, password) => {
    const loggedUser = await authService.login(email, password)
    setUser(loggedUser)
    return loggedUser
  }, [])

  const logout = useCallback(async () => {
    try {
      await authService.logout()
    } finally {
      setUser(null)
    }
  }, [])

  const value = useMemo(
    () => ({ user, isLoading, login, logout, refresh }),
    [user, isLoading, login, logout, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
