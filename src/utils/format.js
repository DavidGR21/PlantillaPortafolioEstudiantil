const dateFormatter = new Intl.DateTimeFormat('es', { dateStyle: 'medium' })

export function formatDate(value) {
  if (!value) return ''
  return dateFormatter.format(new Date(value))
}

/** pluralize(1, 'apartado', 'apartados') -> "1 apartado" */
export function pluralize(count, singular, plural) {
  return `${count} ${count === 1 ? singular : plural}`
}
