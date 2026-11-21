import { apiRequest } from './apiClient.js'

const enc = encodeURIComponent

// ---------- Apartados ----------------------------------------------------

export async function createSection(portfolioId, title) {
  const { section } = await apiRequest('content?type=section', {
    method: 'POST',
    body: { portfolioId, title },
  })
  return section
}

export async function renameSection(id, title) {
  const { section } = await apiRequest(`content?type=section&id=${enc(id)}`, {
    method: 'PATCH',
    body: { title },
  })
  return section
}

export function reorderSections(portfolioId, ids) {
  return apiRequest('content?type=section&action=reorder', {
    method: 'PATCH',
    body: { portfolioId, ids },
  })
}

export function deleteSection(id) {
  return apiRequest(`content?type=section&id=${enc(id)}`, { method: 'DELETE' })
}
