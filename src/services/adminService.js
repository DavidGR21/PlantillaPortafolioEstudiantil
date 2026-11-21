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

// ---------- Portafolios (moderación) ------------------------------------------

/** filters: { q?, status?: 'all' | 'active' | 'blocked' } */
export async function listPortfolios({ q = '', status = 'all' } = {}, signal) {
  const params = new URLSearchParams({ resource: 'portfolios', status })
  if (q.trim()) params.set('q', q.trim())
  const { portfolios } = await apiRequest(`admin?${params}`, { signal })
  return portfolios
}

export async function blockPortfolio(id, reason) {
  const { portfolio } = await apiRequest(`admin?resource=portfolios&id=${enc(id)}&action=block`, {
    method: 'PATCH',
    body: { reason },
  })
  return portfolio
}

export async function unblockPortfolio(id) {
  const { portfolio } = await apiRequest(`admin?resource=portfolios&id=${enc(id)}&action=unblock`, {
    method: 'PATCH',
    body: {}, // la API exige JSON en los PATCH (protección CSRF)
  })
  return portfolio
}

/** { ok, filesDeleted, filesFailed } */
export function deletePortfolioAsAdmin(id) {
  return apiRequest(`admin?resource=portfolios&id=${enc(id)}`, { method: 'DELETE' })
}

// ---------- Bitácora ----------------------------------------------------------

/**
 * filters: { targetType?, action?, q? }; before: cursor de la página anterior.
 * Devuelve { actions, nextCursor }.
 */
export function listActions({ targetType = 'all', action = 'all', q = '' } = {}, { before, signal } = {}) {
  const params = new URLSearchParams({ resource: 'actions', targetType, action })
  if (q.trim()) params.set('q', q.trim())
  if (before) params.set('before', String(before))
  return apiRequest(`admin?${params}`, { signal })
}

export function resetUserPassword(id, password) {
  return apiRequest(`admin?resource=users&id=${enc(id)}&action=reset-password`, {
    method: 'POST',
    body: { password },
  })
}
