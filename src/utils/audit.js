/**
 * Traduce las entradas de la bitácora (admin_actions) a texto legible.
 */

export const ACTION_LABELS = {
  CREATE_USER: 'Creó un usuario',
  UPDATE_USER: 'Editó un usuario',
  ACTIVATE_USER: 'Activó un usuario',
  DEACTIVATE_USER: 'Desactivó un usuario',
  RESET_PASSWORD: 'Restableció una contraseña',
  BLOCK_PORTFOLIO: 'Bloqueó un portafolio',
  UNBLOCK_PORTFOLIO: 'Desbloqueó un portafolio',
  DELETE_PORTFOLIO: 'Eliminó un portafolio',
}

/** Acciones disponibles en el filtro según el tipo elegido. */
export const ACTIONS_BY_TYPE = {
  all: Object.keys(ACTION_LABELS),
  user: ['CREATE_USER', 'UPDATE_USER', 'ACTIVATE_USER', 'DEACTIVATE_USER', 'RESET_PASSWORD'],
  portfolio: ['BLOCK_PORTFOLIO', 'UNBLOCK_PORTFOLIO', 'DELETE_PORTFOLIO'],
}

/** Tono visual de cada acción (para la insignia). */
export const ACTION_TONE = {
  CREATE_USER: 'success',
  UPDATE_USER: 'info',
  ACTIVATE_USER: 'success',
  DEACTIVATE_USER: 'danger',
  RESET_PASSWORD: 'info',
  BLOCK_PORTFOLIO: 'danger',
  UNBLOCK_PORTFOLIO: 'success',
  DELETE_PORTFOLIO: 'danger',
}

const FIELD_LABELS = {
  fullName: 'Nombre',
  role: 'Rol',
  maxPortfolios: 'Máx. portafolios',
  isActive: 'Estado',
}

function formatValue(field, value) {
  if (value === null || value === undefined || value === '') return '—'
  if (field === 'role') return value === 'admin' ? 'Administrador' : 'Estudiante'
  if (field === 'isActive') return value ? 'Activo' : 'Desactivado'
  return String(value)
}

/**
 * Devuelve { summary, details[] }:
 * - summary: frase principal (ej. «Bloqueó “Mi portafolio” de ana@correo.com»)
 * - details: líneas adicionales (motivo, cambios campo por campo, etc.)
 */
export function describeAction({ action, details = {} }) {
  const user = details.fullName ? `${details.fullName} (${details.email})` : details.email
  const portfolio = details.title ? `«${details.title}»` : `/p/${details.slug}`
  const owner = details.ownerEmail ? ` de ${details.ownerEmail}` : ''

  switch (action) {
    case 'CREATE_USER':
      return {
        summary: `Creó la cuenta de ${user}`,
        details: [
          `Rol: ${formatValue('role', details.role)}`,
          `Máx. portafolios: ${details.maxPortfolios ?? '—'}`,
        ],
      }
    case 'UPDATE_USER':
    case 'ACTIVATE_USER':
    case 'DEACTIVATE_USER': {
      const verb = { UPDATE_USER: 'Editó a', ACTIVATE_USER: 'Activó a', DEACTIVATE_USER: 'Desactivó a' }[action]
      const changes = Object.entries(details.changes ?? {}).map(
        ([field, { from, to }]) =>
          `${FIELD_LABELS[field] ?? field}: ${formatValue(field, from)} → ${formatValue(field, to)}`,
      )
      return { summary: `${verb} ${details.email}`, details: action === 'UPDATE_USER' ? changes : [] }
    }
    case 'RESET_PASSWORD':
      return { summary: `Restableció la contraseña de ${details.email}`, details: [] }
    case 'BLOCK_PORTFOLIO':
      return {
        summary: `Bloqueó ${portfolio}${owner}`,
        details: [`Dirección: /p/${details.slug}`, `Motivo: ${details.reason}`],
      }
    case 'UNBLOCK_PORTFOLIO':
      return {
        summary: `Desbloqueó ${portfolio}${owner}`,
        details: [
          `Dirección: /p/${details.slug}`,
          ...(details.previousReason ? [`Motivo del bloqueo anterior: ${details.previousReason}`] : []),
        ],
      }
    case 'DELETE_PORTFOLIO':
      return {
        summary: `Eliminó ${portfolio}${owner}`,
        details: [
          `Dirección: /p/${details.slug}`,
          `Contenido eliminado: ${details.sections ?? 0} apartado(s), ${details.posts ?? 0} publicación(es), ${details.files ?? 0} archivo(s)`,
        ],
      }
    default:
      return { summary: ACTION_LABELS[action] ?? action, details: [] }
  }
}
