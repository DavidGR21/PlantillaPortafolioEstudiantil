import { apiRequest } from './apiClient.js'

/** { portfolios, count, limit } */
export function listMyPortfolios(signal) {
  return apiRequest('portfolios', { signal })
}

export async function getPortfolio(id, signal) {
  const { portfolio } = await apiRequest(`portfolios?id=${encodeURIComponent(id)}`, { signal })
  return portfolio
}

export async function createPortfolio(data) {
  const { portfolio } = await apiRequest('portfolios', { method: 'POST', body: data })
  return portfolio
}

export async function updatePortfolio(id, changes) {
  const { portfolio } = await apiRequest(`portfolios?id=${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: changes,
  })
  return portfolio
}

/** { ok, filesDeleted, filesFailed } */
export function deletePortfolio(id) {
  return apiRequest(`portfolios?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
}

/** { slug, available, error? }. excludeId: el portafolio que se está renombrando. */
export function checkSlug(slug, { excludeId, signal } = {}) {
  const params = new URLSearchParams({ action: 'check-slug', slug })
  if (excludeId) params.set('id', excludeId)
  return apiRequest(`portfolios?${params}`, { signal })
}
