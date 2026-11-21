import { formatBytes } from './format.js'

const MB = 1024 * 1024

// Mismas reglas que la API (api/_lib/validators/files.js).
export const ALLOWED_TYPES = {
  'application/pdf': { kind: 'pdf', maxSize: 50 * MB },
  'image/jpeg': { kind: 'image', maxSize: 10 * MB },
  'image/png': { kind: 'image', maxSize: 10 * MB },
  'image/webp': { kind: 'image', maxSize: 10 * MB },
  'image/gif': { kind: 'image', maxSize: 10 * MB },
}

export const MAX_FILES_PER_POST = 20

/** Para el atributo accept del <input type="file"> */
export const ACCEPT_ATTRIBUTE = '.pdf,.jpg,.jpeg,.png,.webp,.gif,' + Object.keys(ALLOWED_TYPES).join(',')

// Algunos sistemas no informan el tipo: se deduce por la extensión.
const TYPE_BY_EXTENSION = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
}

export function detectMimeType(file) {
  if (ALLOWED_TYPES[file.type]) return file.type
  const ext = file.name.split('.').pop()?.toLowerCase()
  return TYPE_BY_EXTENSION[ext] ?? file.type
}

/** Mensaje de error o null si el archivo se puede subir. */
export function validateFile(file) {
  const mimeType = detectMimeType(file)
  const rules = ALLOWED_TYPES[mimeType]
  if (!rules) return 'Tipo no permitido. Solo PDF, JPG, PNG, WEBP o GIF.'
  if (file.size === 0) return 'El archivo está vacío.'
  if (file.size > rules.maxSize) {
    return `Pesa ${formatBytes(file.size)}; el máximo es ${formatBytes(rules.maxSize)}.`
  }
  return null
}
