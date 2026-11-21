import { apiRequest } from './apiClient.js'

export async function login(email, password) {
  const { user } = await apiRequest('auth?action=login', {
    method: 'POST',
    body: { email, password },
  })
  return user
}

export async function logout() {
  await apiRequest('auth?action=logout', { method: 'POST', body: {} })
}

/** Usuario de la sesión actual o null. */
export async function getCurrentUser(signal) {
  const { user } = await apiRequest('auth?action=me', { signal })
  return user
}
