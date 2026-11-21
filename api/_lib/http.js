import { ZodError } from 'zod'

/** Error con código HTTP que el manejador convierte en respuesta JSON. */
export class HttpError extends Error {
  constructor(status, message, code) {
    super(message)
    this.status = status
    this.code = code
  }
}

export function sendJson(res, status, body) {
  res.setHeader('Cache-Control', 'no-store')
  return res.status(status).json(body)
}

/** Lee el cuerpo JSON (Vercel ya lo parsea, pero puede llegar como string). */
export function readBody(req) {
  const { body } = req
  if (body == null || body === '') return {}
  if (typeof body === 'string') {
    try {
      return JSON.parse(body)
    } catch {
      throw new HttpError(400, 'El cuerpo de la petición no es JSON válido')
    }
  }
  return body
}

/**
 * Las peticiones que modifican datos deben ser JSON. Un formulario HTML de
 * otro sitio no puede enviar application/json sin CORS, así que esto, junto
 * con la cookie SameSite=Lax, protege contra CSRF.
 */
function assertJsonRequest(req) {
  const type = req.headers['content-type'] || ''
  if (!type.toLowerCase().startsWith('application/json')) {
    throw new HttpError(415, 'Content-Type debe ser application/json')
  }
}

// DELETE no se incluye: un formulario HTML no puede enviarlo y, desde otro
// dominio, fetch con DELETE requiere permiso CORS (que no damos).
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH'])

/**
 * Crea un handler de Vercel a partir de un mapa de métodos:
 *   export default createHandler({ GET: async (req, res) => {...}, POST: ... })
 * Centraliza: método no permitido, verificación JSON y manejo de errores.
 */
export function createHandler(methods) {
  return async function handler(req, res) {
    const fn = methods[req.method]
    if (!fn) {
      res.setHeader('Allow', Object.keys(methods).join(', '))
      return sendJson(res, 405, { error: 'Método no permitido' })
    }

    try {
      if (MUTATING_METHODS.has(req.method)) assertJsonRequest(req)
      return await fn(req, res)
    } catch (error) {
      if (error instanceof HttpError) {
        return sendJson(res, error.status, { error: error.message, code: error.code })
      }
      if (error instanceof ZodError) {
        return sendJson(res, 400, {
          error: error.issues[0]?.message || 'Datos inválidos',
          code: 'VALIDATION_ERROR',
          fields: error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
        })
      }
      console.error(`[api] ${req.method} ${req.url}`, error)
      return sendJson(res, 500, { error: 'Error interno del servidor' })
    }
  }
}
