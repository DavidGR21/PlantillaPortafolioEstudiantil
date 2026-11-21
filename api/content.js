import { sql } from './_lib/db.js'
import { requireUser } from './_lib/auth.js'
import { createHandler, HttpError, readBody, sendJson } from './_lib/http.js'
import { getOwnedPortfolio, getOwnedSection } from './_lib/ownership.js'
import { slugify, uniqueSlug } from './_lib/slug.js'
import { deleteStorageObjects } from './_lib/storage.js'
import {
  createSectionSchema,
  idSchema,
  MAX_SECTIONS_PER_PORTFOLIO,
  RESERVED_SECTION_SLUGS,
  reorderSchema,
  updateSectionSchema,
} from './_lib/validators/content.js'

/*
 * Contenido de los portafolios (solo el dueño). El tipo va en ?type=
 *
 * Apartados (type=section):
 *   POST   /api/content?type=section                   { portfolioId, title }  -> 201 { section }
 *   PATCH  /api/content?type=section&id=<uuid>         { title }               -> { section }
 *   PATCH  /api/content?type=section&action=reorder    { portfolioId, ids[] }  -> { ok }
 *   DELETE /api/content?type=section&id=<uuid>                                 -> { ok, filesDeleted, filesFailed }
 *
 * (Parciales y publicaciones se agregan en los pasos 10 y 11.)
 */

function toSection(row) {
  return { id: row.id, title: row.title, slug: row.slug, position: row.position }
}

/** Borra archivos del bucket y registra los que no se pudieron borrar. */
async function cleanupFiles(keys, context) {
  const failed = await deleteStorageObjects(keys)
  if (failed.length > 0) {
    console.error(`[content] ${failed.length} archivo(s) huérfano(s) (${context}):`, failed)
  }
  return { filesDeleted: keys.length - failed.length, filesFailed: failed.length }
}

/** Slug único del apartado dentro del portafolio (excluyendo el propio al renombrar). */
async function freeSectionSlug(portfolioId, title, excludeId = null) {
  const rows = await sql`
    SELECT slug FROM sections
    WHERE portfolio_id = ${portfolioId}
      AND id IS DISTINCT FROM ${excludeId}::uuid
  `
  return uniqueSlug(slugify(title), new Set(rows.map((r) => r.slug)), RESERVED_SECTION_SLUGS)
}

const isSlugConflict = (error) => error.code === '23505' && error.constraint === 'sections_unique_slug'

// ---------- Apartados ----------------------------------------------------

async function createSection(req, res, user) {
  const { portfolioId, title } = createSectionSchema.parse(readBody(req))
  await getOwnedPortfolio(user, portfolioId)

  const [{ count }] = await sql`SELECT count(*)::int AS count FROM sections WHERE portfolio_id = ${portfolioId}`
  if (count >= MAX_SECTIONS_PER_PORTFOLIO) {
    throw new HttpError(409, `Máximo ${MAX_SECTIONS_PER_PORTFOLIO} apartados por portafolio.`, 'SECTION_LIMIT_REACHED')
  }

  // Reintenta una vez si otra petición simultánea tomó el mismo slug.
  for (let attempt = 0; attempt < 2; attempt++) {
    const slug = await freeSectionSlug(portfolioId, title)
    try {
      const [row] = await sql`
        INSERT INTO sections (portfolio_id, title, slug, position)
        VALUES (
          ${portfolioId}, ${title}, ${slug},
          (SELECT COALESCE(max(position), 0) + 1 FROM sections WHERE portfolio_id = ${portfolioId})
        )
        RETURNING *
      `
      return sendJson(res, 201, { section: toSection(row) })
    } catch (error) {
      if (!isSlugConflict(error) || attempt === 1) throw error
    }
  }
}

async function updateSection(req, res, user) {
  const section = await getOwnedSection(user, idSchema.parse(req.query.id))
  const { title } = updateSectionSchema.parse(readBody(req))

  // El slug (la URL del apartado) se regenera a partir del nuevo nombre.
  const slug = await freeSectionSlug(section.portfolio_id, title, section.id)
  try {
    const [row] = await sql`
      UPDATE sections SET title = ${title}, slug = ${slug}
      WHERE id = ${section.id}
      RETURNING *
    `
    return sendJson(res, 200, { section: toSection(row) })
  } catch (error) {
    if (isSlugConflict(error)) {
      throw new HttpError(409, 'Hubo un conflicto al guardar. Inténtalo de nuevo.', 'CONFLICT')
    }
    throw error
  }
}

async function reorderSections(req, res, user) {
  const { portfolioId, ids } = reorderSchema.parse(readBody(req))
  await getOwnedPortfolio(user, portfolioId)

  // La lista debe contener exactamente los apartados del portafolio.
  const rows = await sql`SELECT id FROM sections WHERE portfolio_id = ${portfolioId}`
  const current = new Set(rows.map((r) => r.id))
  if (current.size !== ids.length || !ids.every((id) => current.has(id))) {
    throw new HttpError(409, 'La lista de apartados cambió. Recarga la página.', 'STALE_ORDER')
  }

  // Una sola sentencia (atómica): posición = índice en la lista.
  await sql`
    UPDATE sections s
    SET position = t.ord
    FROM unnest(${ids}::uuid[]) WITH ORDINALITY AS t(id, ord)
    WHERE s.id = t.id AND s.portfolio_id = ${portfolioId}
  `
  return sendJson(res, 200, { ok: true })
}

async function deleteSection(req, res, user) {
  const section = await getOwnedSection(user, idSchema.parse(req.query.id))

  const keys = (
    await sql`
      SELECT f.storage_key
      FROM post_files f
      JOIN posts po ON po.id = f.post_id
      JOIN subsections ss ON ss.id = po.subsection_id
      WHERE ss.section_id = ${section.id}
    `
  ).map((r) => r.storage_key)

  await sql`DELETE FROM sections WHERE id = ${section.id}`
  const result = await cleanupFiles(keys, `apartado ${section.id}`)
  return sendJson(res, 200, { ok: true, ...result })
}

// ---------- Enrutado -----------------------------------------------------

const routes = {
  section: {
    POST: createSection,
    PATCH: (req, res, user) =>
      req.query.action === 'reorder' ? reorderSections(req, res, user) : updateSection(req, res, user),
    DELETE: deleteSection,
  },
}

function dispatch(method) {
  return async (req, res) => {
    const user = await requireUser(req)
    const fn = routes[req.query.type]?.[method]
    if (!fn) throw new HttpError(404, 'Ruta no encontrada', 'NOT_FOUND')
    return fn(req, res, user)
  }
}

export default createHandler({
  POST: dispatch('POST'),
  PATCH: dispatch('PATCH'),
  DELETE: dispatch('DELETE'),
})
