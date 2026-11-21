import { apiRequest } from './apiClient.js'

/** { portfolio, sections, viewer: { canEdit, preview } } */
export function getPublicPortfolio(slug, signal) {
  return apiRequest(`public?slug=${encodeURIComponent(slug)}`, { signal })
}
