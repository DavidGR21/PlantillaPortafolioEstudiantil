import { createContext } from 'react'

/**
 * Valor: { user, isLoading, login(email, password), logout(), refresh() }
 * - user: null si no hay sesión
 * - isLoading: true mientras se consulta la sesión al cargar la app
 */
export const AuthContext = createContext(null)
