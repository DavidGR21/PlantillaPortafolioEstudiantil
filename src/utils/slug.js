// Mismas reglas que la API y la base de datos.
export const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$/
export const SLUG_MAX_LENGTH = 60

/** "Portafolio de Íñigo Pérez" -> "portafolio-de-inigo-perez" */
export function slugify(text) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita tildes
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/-+$/, '')
}

/** Mensaje de error local (sin ir al servidor) o null si el formato es válido. */
export function validateSlugFormat(slug) {
  if (!slug) return 'La dirección es obligatoria'
  if (slug.length < 3) return 'Mínimo 3 caracteres'
  if (slug.length > SLUG_MAX_LENGTH) return `Máximo ${SLUG_MAX_LENGTH} caracteres`
  if (!SLUG_REGEX.test(slug)) {
    return 'Solo minúsculas, números y guiones (sin guion al inicio o al final)'
  }
  return null
}

/** URL pública completa de un portafolio. */
export function publicPortfolioUrl(slug) {
  return `${window.location.origin}/p/${slug}`
}
