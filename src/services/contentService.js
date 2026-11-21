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

// ---------- Parciales (submódulos) ------------------------------------------

export async function createSubsection(sectionId, title) {
  const { subsection } = await apiRequest('content?type=subsection', {
    method: 'POST',
    body: { sectionId, title },
  })
  return subsection
}

export async function renameSubsection(id, title) {
  const { subsection } = await apiRequest(`content?type=subsection&id=${enc(id)}`, {
    method: 'PATCH',
    body: { title },
  })
  return subsection
}

export function reorderSubsections(sectionId, ids) {
  return apiRequest('content?type=subsection&action=reorder', {
    method: 'PATCH',
    body: { sectionId, ids },
  })
}

export function deleteSubsection(id) {
  return apiRequest(`content?type=subsection&id=${enc(id)}`, { method: 'DELETE' })
}
