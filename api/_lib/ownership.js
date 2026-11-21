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

/**
 * Devuelve el parcial (con section_id) si su portafolio pertenece al usuario.
 */
export async function getOwnedSubsection(user, subsectionId) {
  const [subsection] = await sql`
    SELECT ss.*, p.owner_id
    FROM subsections ss
    JOIN sections s ON s.id = ss.section_id
    JOIN portfolios p ON p.id = s.portfolio_id
    WHERE ss.id = ${subsectionId}
  `
  if (!subsection) throw new HttpError(404, 'Parcial no encontrado', 'NOT_FOUND')
  if (subsection.owner_id !== user.id) {
    throw new HttpError(403, 'Este parcial no es tuyo', 'NOT_OWNER')
  }
  return subsection
}

/**
 * Devuelve la publicación (con subsection_id y portfolio_id) si su portafolio pertenece al usuario.
 */
export async function getOwnedPost(user, postId) {
  const [post] = await sql`
    SELECT po.*, s.portfolio_id, p.owner_id
    FROM posts po
    JOIN subsections ss ON ss.id = po.subsection_id
    JOIN sections s ON s.id = ss.section_id
    JOIN portfolios p ON p.id = s.portfolio_id
    WHERE po.id = ${postId}
  `
  if (!post) throw new HttpError(404, 'Publicación no encontrada', 'NOT_FOUND')
  if (post.owner_id !== user.id) {
    throw new HttpError(403, 'Esta publicación no es tuya', 'NOT_OWNER')
  }
  return post
}

/**
 * Devuelve el archivo (con post_id) si su portafolio pertenece al usuario.
 */
export async function getOwnedFile(user, fileId) {
  const [file] = await sql`
    SELECT f.*, p.owner_id
    FROM post_files f
    JOIN posts po ON po.id = f.post_id
    JOIN subsections ss ON ss.id = po.subsection_id
    JOIN sections s ON s.id = ss.section_id
    JOIN portfolios p ON p.id = s.portfolio_id
    WHERE f.id = ${fileId}
  `
  if (!file) throw new HttpError(404, 'Archivo no encontrado', 'NOT_FOUND')
  if (file.owner_id !== user.id) {
    throw new HttpError(403, 'Este archivo no es tuyo', 'NOT_OWNER')
  }
  return file
}
