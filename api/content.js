import { sql } from './_lib/db.js'
import { requireUser } from './_lib/auth.js'
import { createHandler, HttpError, readBody, sendJson } from './_lib/http.js'
import { getOwnedPortfolio, getOwnedPost, getOwnedSection, getOwnedSubsection } from './_lib/ownership.js'
import { slugify, uniqueSlug } from './_lib/slug.js'
import { deleteStorageObjects } from './_lib/storage.js'
import {
  createPostSchema,
  createSectionSchema,
  createSubsectionSchema,
  idSchema,
  MAX_POSTS_PER_SUBSECTION,
  MAX_SECTIONS_PER_PORTFOLIO,
  MAX_SUBSECTIONS_PER_SECTION,
  RESERVED_SECTION_SLUGS,
  reorderPostsSchema,
  reorderSectionsSchema,
  reorderSubsectionsSchema,
  updatePostSchema,
  updateSectionSchema,
  updateSubsectionSchema,
} from './_lib/validators/content.js'

/*
 * Contenido de los portafolios (solo el dueño). El tipo va en ?type=
 *
 * Apartados (type=section):
 *   POST   ?type=section                    { portfolioId, title } -> 201 { section }
 *   PATCH  ?type=section&id=<uuid>          { title }              -> { section }
 *   PATCH  ?type=section&action=reorder     { portfolioId, ids[] } -> { ok }
 *   DELETE ?type=section&id=<uuid>                                 -> { ok, filesDeleted, filesFailed }
 *
 * Parciales / submódulos (type=subsection):
 *   POST   ?type=subsection                 { sectionId, title }   -> 201 { subsection }
 *   PATCH  ?type=subsection&id=<uuid>       { title }              -> { subsection }
 *   PATCH  ?type=subsection&action=reorder  { sectionId, ids[] }   -> { ok }
 *   DELETE ?type=subsection&id=<uuid>                              -> { ok, filesDeleted, filesFailed }
 *
 * Publicaciones (type=post):
 *   POST   ?type=post                       { subsectionId, title, description? } -> 201 { post }
 *   PATCH  ?type=post&id=<uuid>             { title?, description? }              -> { post }
 *   PATCH  ?type=post&action=reorder        { subsectionId, ids[] }               -> { ok }
 *   DELETE ?type=post&id=<uuid>                                                   -> { ok, filesDeleted, filesFailed }
 *
 * (Los archivos de cada publicación se gestionan en /api/files, pasos 12-13.)
 */

// ---------- Utilidades -----------------------------------------------------

/** Borra archivos del bucket y registra los que no se pudieron borrar. */
async function cleanupFiles(keys, context) {
  const failed = await deleteStorageObjects(keys)
  if (failed.length > 0) {
    console.error(`[content] ${failed.length} archivo(s) huérfano(s) (${context}):`, failed)
  }
  return { filesDeleted: keys.length - failed.length, filesFailed: failed.length }
}

/** La lista recibida debe contener exactamente los elementos actuales (ni más ni menos). */
function assertSameItems(currentRows, ids, label) {
  const current = new Set(currentRows.map((r) => r.id))
  if (current.size !== ids.length || !ids.every((id) => current.has(id))) {
    throw new HttpError(409, `La lista de ${label} cambió. Recarga la página.`, 'STALE_ORDER')
  }
}

// ---------- Apartados ----------------------------------------------------

function toSection(row) {
  return { id: row.id, title: row.title, slug: row.slug, position: row.position }
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
  const { portfolioId, ids } = reorderSectionsSchema.parse(readBody(req))
  await getOwnedPortfolio(user, portfolioId)
  assertSameItems(await sql`SELECT id FROM sections WHERE portfolio_id = ${portfolioId}`, ids, 'apartados')

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

// ---------- Parciales (submódulos) ------------------------------------------

function toSubsection(row) {
  return { id: row.id, title: row.title, position: row.position }
}

async function createSubsection(req, res, user) {
  const { sectionId, title } = createSubsectionSchema.parse(readBody(req))
  await getOwnedSection(user, sectionId)

  const [{ count }] = await sql`SELECT count(*)::int AS count FROM subsections WHERE section_id = ${sectionId}`
  if (count >= MAX_SUBSECTIONS_PER_SECTION) {
    throw new HttpError(409, `Máximo ${MAX_SUBSECTIONS_PER_SECTION} parciales por apartado.`, 'SUBSECTION_LIMIT_REACHED')
  }

  const [row] = await sql`
    INSERT INTO subsections (section_id, title, position)
    VALUES (
      ${sectionId}, ${title},
      (SELECT COALESCE(max(position), 0) + 1 FROM subsections WHERE section_id = ${sectionId})
    )
    RETURNING *
  `
  return sendJson(res, 201, { subsection: toSubsection(row) })
}

async function updateSubsection(req, res, user) {
  const subsection = await getOwnedSubsection(user, idSchema.parse(req.query.id))
  const { title } = updateSubsectionSchema.parse(readBody(req))

  const [row] = await sql`
    UPDATE subsections SET title = ${title}
    WHERE id = ${subsection.id}
    RETURNING *
  `
  return sendJson(res, 200, { subsection: toSubsection(row) })
}

async function reorderSubsections(req, res, user) {
  const { sectionId, ids } = reorderSubsectionsSchema.parse(readBody(req))
  await getOwnedSection(user, sectionId)
  assertSameItems(await sql`SELECT id FROM subsections WHERE section_id = ${sectionId}`, ids, 'parciales')

  await sql`
    UPDATE subsections ss
    SET position = t.ord
    FROM unnest(${ids}::uuid[]) WITH ORDINALITY AS t(id, ord)
    WHERE ss.id = t.id AND ss.section_id = ${sectionId}
  `
  return sendJson(res, 200, { ok: true })
}

async function deleteSubsection(req, res, user) {
  const subsection = await getOwnedSubsection(user, idSchema.parse(req.query.id))

  const keys = (
    await sql`
      SELECT f.storage_key
      FROM post_files f
      JOIN posts po ON po.id = f.post_id
      WHERE po.subsection_id = ${subsection.id}
    `
  ).map((r) => r.storage_key)

  await sql`DELETE FROM subsections WHERE id = ${subsection.id}`
  const result = await cleanupFiles(keys, `parcial ${subsection.id}`)
  return sendJson(res, 200, { ok: true, ...result })
}

// ---------- Publicaciones ----------------------------------------------------

function toPost(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function createPost(req, res, user) {
  const { subsectionId, title, description } = createPostSchema.parse(readBody(req))
  await getOwnedSubsection(user, subsectionId)

  const [{ count }] = await sql`SELECT count(*)::int AS count FROM posts WHERE subsection_id = ${subsectionId}`
  if (count >= MAX_POSTS_PER_SUBSECTION) {
    throw new HttpError(409, `Máximo ${MAX_POSTS_PER_SUBSECTION} publicaciones por parcial.`, 'POST_LIMIT_REACHED')
  }

  const [row] = await sql`
    INSERT INTO posts (subsection_id, title, description, position)
    VALUES (
      ${subsectionId}, ${title}, ${description ?? null},
      (SELECT COALESCE(max(position), 0) + 1 FROM posts WHERE subsection_id = ${subsectionId})
    )
    RETURNING *
  `
  return sendJson(res, 201, { post: toPost(row) })
}

async function updatePost(req, res, user) {
  const post = await getOwnedPost(user, idSchema.parse(req.query.id))
  const data = updatePostSchema.parse(readBody(req))
  const has = (key) => Object.hasOwn(data, key)

  const [row] = await sql`
    UPDATE posts SET
      title       = CASE WHEN ${has('title')}       THEN ${data.title ?? null}       ELSE title       END,
      description = CASE WHEN ${has('description')} THEN ${data.description ?? null} ELSE description END
    WHERE id = ${post.id}
    RETURNING *
  `
  return sendJson(res, 200, { post: toPost(row) })
}

async function reorderPosts(req, res, user) {
  const { subsectionId, ids } = reorderPostsSchema.parse(readBody(req))
  await getOwnedSubsection(user, subsectionId)
  assertSameItems(await sql`SELECT id FROM posts WHERE subsection_id = ${subsectionId}`, ids, 'publicaciones')

  await sql`
    UPDATE posts po
    SET position = t.ord
    FROM unnest(${ids}::uuid[]) WITH ORDINALITY AS t(id, ord)
    WHERE po.id = t.id AND po.subsection_id = ${subsectionId}
  `
  return sendJson(res, 200, { ok: true })
}

async function deletePost(req, res, user) {
  const post = await getOwnedPost(user, idSchema.parse(req.query.id))

  const keys = (await sql`SELECT storage_key FROM post_files WHERE post_id = ${post.id}`).map(
    (r) => r.storage_key,
  )

  await sql`DELETE FROM posts WHERE id = ${post.id}`
  const result = await cleanupFiles(keys, `publicación ${post.id}`)
  return sendJson(res, 200, { ok: true, ...result })
}

// ---------- Enrutado -----------------------------------------------------

/** PATCH con ?action=reorder reordena; si no, actualiza el elemento ?id= */
const patchOrReorder = (update, reorder) => (req, res, user) =>
  req.query.action === 'reorder' ? reorder(req, res, user) : update(req, res, user)

const routes = {
  section: {
    POST: createSection,
    PATCH: patchOrReorder(updateSection, reorderSections),
    DELETE: deleteSection,
  },
  subsection: {
    POST: createSubsection,
    PATCH: patchOrReorder(updateSubsection, reorderSubsections),
    DELETE: deleteSubsection,
  },
  post: {
    POST: createPost,
    PATCH: patchOrReorder(updatePost, reorderPosts),
    DELETE: deletePost,
  },
}

function dispatch(method) {
  return async (req, res) => {
    const user = await requireUser(req)
    const group = Object.hasOwn(routes, req.query.type ?? '') ? routes[req.query.type] : null
    const fn = group && Object.hasOwn(group, method) ? group[method] : null
    if (!fn) throw new HttpError(404, 'Ruta no encontrada', 'NOT_FOUND')
    return fn(req, res, user)
  }
}

export default createHandler({
  POST: dispatch('POST'),
  PATCH: dispatch('PATCH'),
  DELETE: dispatch('DELETE'),
})
