const dateFormatter = new Intl.DateTimeFormat('es', { dateStyle: 'medium' })

export function formatDate(value) {
  if (!value) return ''
  return dateFormatter.format(new Date(value))
}

const dateTimeFormatter = new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeStyle: 'short' })

/** "21 nov 2026, 7:23" */
export function formatDateTime(value) {
  if (!value) return ''
  return dateTimeFormatter.format(new Date(value))
}

/** 1536 -> "1.5 KB" */
export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** exponent
  return `${value.toFixed(value < 10 && exponent > 0 ? 1 : 0)} ${units[exponent]}`
}

/** pluralize(1, 'apartado', 'apartados') -> "1 apartado" */
export function pluralize(count, singular, plural) {
  return `${count} ${count === 1 ? singular : plural}`
}

/** Iniciales para avatares: "Ana María Pérez" -> "AP". */
export function initialsOf(name = '') {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  const first = words[0][0]
  const last = words.length > 1 ? words[words.length - 1][0] : ''
  return (first + last).toUpperCase()
}

const relativeFormatter = new Intl.RelativeTimeFormat('es', { numeric: 'auto' })
const RELATIVE_STEPS = [
  { unit: 'minute', seconds: 60 },
  { unit: 'hour', seconds: 3600 },
  { unit: 'day', seconds: 86400 },
  { unit: 'week', seconds: 604800 },
  { unit: 'month', seconds: 2629800 },
  { unit: 'year', seconds: 31557600 },
]

/**
 * Tiempo relativo legible: "hace un momento", "hace 5 minutos", "ayer",
 * "hace 3 semanas"... `now` permite fijar la fecha de referencia (pruebas).
 */
export function formatRelativeTime(value, now = Date.now()) {
  if (!value) return ''
  const seconds = (new Date(value).getTime() - now) / 1000
  if (Math.abs(seconds) < 45) return 'hace un momento'
  for (let i = RELATIVE_STEPS.length - 1; i >= 0; i--) {
    const { unit, seconds: size } = RELATIVE_STEPS[i]
    if (Math.abs(seconds) >= size) return relativeFormatter.format(Math.round(seconds / size), unit)
  }
  return relativeFormatter.format(Math.round(seconds / 60), 'minute')
}
