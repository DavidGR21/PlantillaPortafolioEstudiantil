import { sql } from './db.js'
import { HttpError } from './http.js'

/**
 * Devuelve el portafolio si pertenece al usuario.
 * 404 si no existe; 403 si existe pero es de otra persona.
 * TODA ruta que modifique un portafolio o su contenido debe pasar por aquí.
 */
export async function getOwnedPortfolio(user, portfolioId) {
  const [portfolio] = await sql`SELECT * FROM portfolios WHERE id = ${portfolioId}`
  if (!portfolio) throw new HttpError(404, 'Portafolio no encontrado', 'NOT_FOUND')
  if (portfolio.owner_id !== user.id) {
    throw new HttpError(403, 'Este portafolio no es tuyo', 'NOT_OWNER')
  }
  return portfolio
}
