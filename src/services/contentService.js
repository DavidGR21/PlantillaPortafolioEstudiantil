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

// ---------- Publicaciones --------------------------------------------------

/** data: { title, description? } */
export async function createPost(subsectionId, data) {
  const { post } = await apiRequest('content?type=post', {
    method: 'POST',
    body: { subsectionId, ...data },
  })
  return post
}

/** changes: { title?, description? } */
export async function updatePost(id, changes) {
  const { post } = await apiRequest(`content?type=post&id=${enc(id)}`, {
    method: 'PATCH',
    body: changes,
  })
  return post
}

export function reorderPosts(subsectionId, ids) {
  return apiRequest('content?type=post&action=reorder', {
    method: 'PATCH',
    body: { subsectionId, ids },
  })
}

export function deletePost(id) {
  return apiRequest(`content?type=post&id=${enc(id)}`, { method: 'DELETE' })
}

/** changes: { title?, description? } (texto bajo la portada del apartado) */
export async function updateSection(id, changes) {
  const { section } = await apiRequest(`content?type=section&id=${enc(id)}`, {
    method: 'PATCH',
    body: changes,
  })
  return section
}
