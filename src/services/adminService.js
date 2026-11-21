import { apiRequest } from './apiClient.js'

const enc = encodeURIComponent

// ---------- Usuarios ---------------------------------------------------------

export async function listUsers(q = '', signal) {
  const params = new URLSearchParams({ resource: 'users' })
  if (q.trim()) params.set('q', q.trim())
  const { users } = await apiRequest(`admin?${params}`, { signal })
  return users
}

/** data: { email, fullName, password, role, maxPortfolios } */
export async function createUser(data) {
  const { user } = await apiRequest('admin?resource=users', { method: 'POST', body: data })
  return user
}

/** changes: { fullName?, role?, maxPortfolios?, isActive? } */
export async function updateUser(id, changes) {
  const { user } = await apiRequest(`admin?resource=users&id=${enc(id)}`, {
    method: 'PATCH',
    body: changes,
  })
  return user
}

export function resetUserPassword(id, password) {
  return apiRequest(`admin?resource=users&id=${enc(id)}&action=reset-password`, {
    method: 'POST',
    body: { password },
  })
}
