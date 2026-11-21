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

/**
 * Devuelve el apartado (con portfolio_id) si su portafolio pertenece al usuario.
 */
export async function getOwnedSection(user, sectionId) {
  const [section] = await sql`
    SELECT s.*, p.owner_id
    FROM sections s
    JOIN portfolios p ON p.id = s.portfolio_id
    WHERE s.id = ${sectionId}
  `
  if (!section) throw new HttpError(404, 'Apartado no encontrado', 'NOT_FOUND')
  if (section.owner_id !== user.id) {
    throw new HttpError(403, 'Este apartado no es tuyo', 'NOT_OWNER')
  }
  return section
}
