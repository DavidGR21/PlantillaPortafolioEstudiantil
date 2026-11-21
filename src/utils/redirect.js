/**
 * Valida el parámetro ?next= para evitar redirecciones a otros sitios
 * (open redirect). Solo se aceptan rutas internas como "/p/mi-portafolio/editar".
 */
export function safeNextPath(next) {
  if (typeof next !== 'string') return null
  if (!next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return null
  if (next.startsWith('/login')) return null
  return next
}

/** Destino por defecto tras iniciar sesión, según el rol. */
export function homePathFor(user) {
  return user?.role === 'admin' ? '/admin' : '/dashboard'
}
