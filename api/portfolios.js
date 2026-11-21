import { sql } from './_lib/db.js'
import { requireUser } from './_lib/auth.js'
import { createHandler, HttpError, readBody, sendJson } from './_lib/http.js'
import { getOwnedPortfolio } from './_lib/ownership.js'
import { deleteStorageObjects } from './_lib/storage.js'
import {
  createPortfolioSchema,
  idSchema,
  slugSchema,
  updatePortfolioSchema,
} from './_lib/validators/portfolio.js'

/*
 * Portafolios del usuario con sesión (solo los suyos).
 *
 * GET    /api/portfolios                               -> { portfolios, count, limit }
 * GET    /api/portfolios?id=<uuid>                     -> { portfolio }
 * GET    /api/portfolios?action=check-slug&slug=x[&id] -> { slug, available, error? }
 * POST   /api/portfolios          { slug, title, subtitle?, description? } -> 201 { portfolio }
 * PATCH  /api/portfolios?id=<uuid> { slug?, title?, subtitle?, description?, theme? } -> { portfolio }
 * DELETE /api/portfolios?id=<uuid>                     -> { ok, filesDeleted, filesFailed }
 */

function toPortfolio(row) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle,
    description: row.description,
    avatarUrl: row.avatar_url,
    theme: row.theme,
    status: row.status,
    blockedReason: row.blocked_reason,
    blockedAt: row.blocked_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.sections_count !== undefined && {
      sectionsCount: row.sections_count,
      subsectionsCount: row.subsections_count,
      postsCount: row.posts_count,
      filesCount: row.files_count,
      // Última actividad real: el portafolio o cualquier contenido dentro de él.
      lastActivityAt: row.last_activity_at,
    }),
  }
}

/** Traduce errores de la BD a mensajes claros. */
function mapDbError(error) {
  if (error.code === '23505' && error.constraint === 'portfolios_slug_key') {
    return new HttpError(409, 'Esa dirección ya está en uso. Elige otra.', 'SLUG_TAKEN')
  }
  if (error.code === '23514' && error.message?.includes('PORTFOLIO_LIMIT_REACHED')) {
    return new HttpError(409, 'Alcanzaste el máximo de portafolios permitidos.', 'PORTFOLIO_LIMIT_REACHED')
  }
  return error
}

// ---------- GET ----------------------------------------------------------

async function list(req, res, user) {
  // Contadores y última actividad en una sola pasada por el contenido.
  // (portfolios.updated_at solo cambia al editar el portafolio, no al agregar
  // apartados o publicaciones; por eso se calcula la actividad real.)
  const rows = await sql`
    SELECT p.*,
      (SELECT count(*)::int FROM sections s WHERE s.portfolio_id = p.id) AS sections_count,
      st.subsections_count, st.posts_count, st.files_count,
      greatest(p.updated_at, st.last_content_at) AS last_activity_at
    FROM portfolios p
    CROSS JOIN LATERAL (
      SELECT
        count(DISTINCT ss.id)::int AS subsections_count,
        count(DISTINCT po.id)::int AS posts_count,
        count(f.id)::int           AS files_count,
        greatest(max(s.updated_at), max(ss.updated_at), max(po.updated_at), max(f.created_at)) AS last_content_at
      FROM sections s
      LEFT JOIN subsections ss ON ss.section_id = s.id
      LEFT JOIN posts po ON po.subsection_id = ss.id
      LEFT JOIN post_files f ON f.post_id = po.id
      WHERE s.portfolio_id = p.id
    ) st
    WHERE p.owner_id = ${user.id}
    ORDER BY p.created_at
  `
  return sendJson(res, 200, {
    portfolios: rows.map(toPortfolio),
    count: rows.length,
    limit: user.maxPortfolios,
  })
}

async function getOne(req, res, user) {
  const portfolio = await getOwnedPortfolio(user, idSchema.parse(req.query.id))
  return sendJson(res, 200, { portfolio: toPortfolio(portfolio) })
}

async function checkSlug(req, res, user) {
  const result = slugSchema.safeParse(req.query.slug ?? '')
  if (!result.success) {
    return sendJson(res, 200, {
      slug: req.query.slug ?? '',
      available: false,
      error: result.error.issues[0].message,
    })
  }
  const slug = result.data
  // Al renombrar, el propio portafolio (solo si es del usuario) no cuenta como "ocupado".
  const excludeId = req.query.id ? idSchema.parse(req.query.id) : null
  const [taken] = await sql`
    SELECT 1 FROM portfolios
    WHERE slug = ${slug}
      AND NOT (id IS NOT DISTINCT FROM ${excludeId}::uuid AND owner_id = ${user.id})
  `
  return sendJson(res, 200, {
    slug,
    available: !taken,
    ...(taken && { error: 'Esa dirección ya está en uso' }),
  })
}

// ---------- POST ---------------------------------------------------------

async function create(req, res, user) {
  const data = createPortfolioSchema.parse(readBody(req))

  // Comprobación amable antes de insertar (el trigger de la BD es la garantía final).
  const [{ count }] = await sql`SELECT count(*)::int AS count FROM portfolios WHERE owner_id = ${user.id}`
  if (count >= user.maxPortfolios) {
    throw new HttpError(
      409,
      `Ya tienes ${count} de ${user.maxPortfolios} portafolios permitidos.`,
      'PORTFOLIO_LIMIT_REACHED',
    )
  }

  try {
    const [row] = await sql`
      INSERT INTO portfolios (owner_id, slug, title, subtitle, description)
      VALUES (${user.id}, ${data.slug}, ${data.title}, ${data.subtitle ?? null}, ${data.description ?? null})
      RETURNING *
    `
    return sendJson(res, 201, { portfolio: toPortfolio(row) })
  } catch (error) {
    throw mapDbError(error)
  }
}

// ---------- PATCH --------------------------------------------------------

async function update(req, res, user) {
  const portfolio = await getOwnedPortfolio(user, idSchema.parse(req.query.id))
  const data = updatePortfolioSchema.parse(readBody(req))
  const has = (key) => Object.hasOwn(data, key)

  try {
    const [row] = await sql`
      UPDATE portfolios SET
        slug        = CASE WHEN ${has('slug')}        THEN ${data.slug ?? null}        ELSE slug        END,
        title       = CASE WHEN ${has('title')}       THEN ${data.title ?? null}       ELSE title       END,
        subtitle    = CASE WHEN ${has('subtitle')}    THEN ${data.subtitle ?? null}    ELSE subtitle    END,
        description = CASE WHEN ${has('description')} THEN ${data.description ?? null} ELSE description END,
        theme       = CASE WHEN ${has('theme')}
                           THEN ${has('theme') ? JSON.stringify(data.theme) : null}::jsonb
                           ELSE theme END
      WHERE id = ${portfolio.id}
      RETURNING *
    `
    return sendJson(res, 200, { portfolio: toPortfolio(row) })
  } catch (error) {
    throw mapDbError(error)
  }
}

// ---------- DELETE -------------------------------------------------------

async function remove(req, res, user) {
  const portfolio = await getOwnedPortfolio(user, idSchema.parse(req.query.id))

  // 1) Claves de los archivos en el bucket (antes de que la cascada borre las filas).
  const keys = (await sql`SELECT storage_key FROM portfolio_storage_keys(${portfolio.id})`).map(
    (r) => r.storage_key,
  )

  // 2) Borrar de la BD (cascada: apartados, parciales, publicaciones, archivos).
  await sql`DELETE FROM portfolios WHERE id = ${portfolio.id}`

  // 3) Borrar del bucket. Si algo falla, quedan archivos huérfanos (se registran),
  //    pero nunca registros que apunten a archivos inexistentes.
  const failed = await deleteStorageObjects(keys)
  if (failed.length > 0) {
    console.error(`[portfolios] ${failed.length} archivo(s) huérfano(s) del portafolio ${portfolio.id}:`, failed)
  }

  return sendJson(res, 200, {
    ok: true,
    filesDeleted: keys.length - failed.length,
    filesFailed: failed.length,
  })
}

// ---------- Enrutado -----------------------------------------------------

function withUser(fn) {
  return async (req, res) => fn(req, res, await requireUser(req))
}

export default createHandler({
  GET: withUser((req, res, user) => {
    if (req.query.action === 'check-slug') return checkSlug(req, res, user)
    if (req.query.action) throw new HttpError(404, 'Acción no encontrada', 'NOT_FOUND')
    if (req.query.id) return getOne(req, res, user)
    return list(req, res, user)
  }),
  POST: withUser(create),
  PATCH: withUser(update),
  DELETE: withUser(remove),
})
