/** "Programación Web I" -> "programacion-web-i" (mismo criterio que el frontend). */
export function slugify(text, maxLength = 100) {
  return String(text)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/, '')
}

/**
 * Devuelve un slug libre a partir de `base`, añadiendo -2, -3... si hace falta.
 * `taken` es un Set con los slugs ya usados; `reserved` los prohibidos.
 */
export function uniqueSlug(base, taken, reserved = new Set(), maxLength = 100) {
  const root = base || 'apartado'
  let candidate = root
  let n = 2
  while (taken.has(candidate) || reserved.has(candidate)) {
    const suffix = `-${n++}`
    candidate = root.slice(0, maxLength - suffix.length).replace(/-+$/, '') + suffix
  }
  return candidate
}
