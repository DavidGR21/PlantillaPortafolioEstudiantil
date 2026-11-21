import bcrypt from 'bcryptjs'
import { sql } from './_lib/db.js'
import { requireAdmin } from './_lib/auth.js'
import { auditQuery } from './_lib/audit.js'
import { createHandler, HttpError, readBody, sendJson } from './_lib/http.js'
import { deleteStorageObjects } from './_lib/storage.js'
import {
  blockPortfolioSchema,
  createUserSchema,
  idSchema,
  listActionsSchema,
  listPortfoliosSchema,
  listUsersSchema,
  resetPasswordSchema,
  updateUserSchema,
} from './_lib/validators/admin.js'

/*
 * Administración (solo rol admin). El recurso va en ?resource=
 *
 * Usuarios (resource=users):
 *   GET   ?resource=users[&q=texto]                    -> { users }
 *   POST  ?resource=users        { email, fullName, password, role?, maxPortfolios? } -> 201 { user }
 *   PATCH ?resource=users&id=<uuid> { fullName?, role?, maxPortfolios?, isActive? }   -> { user }
 *   POST  ?resource=users&id=<uuid>&action=reset-password { password }                -> { ok }
 *
 * Portafolios (resource=portfolios):
 *   GET    ?resource=portfolios[&q=texto][&status=all|active|blocked] -> { portfolios }
 *   PATCH  ?resource=portfolios&id=<uuid>&action=block   { reason }   -> { portfolio }
 *   PATCH  ?resource=portfolios&id=<uuid>&action=unblock              -> { portfolio }
 *   DELETE ?resource=portfolios&id=<uuid>                             -> { ok, filesDeleted, filesFailed }
 *   (Para VER el contenido, el admin usa /api/public: ve también los bloqueados.)
 *
 * Bitácora (resource=actions):
 *   GET ?resource=actions[&targetType=all|user|portfolio][&action=...][&q=texto][&before=<id>][&limit=50]
 *       -> { actions, nextCursor }   (nextCursor = valor para ?before= de la página siguiente)
 * Cada cambio queda registrado en admin_actions.
 */

const BCRYPT_ROUNDS = 10

function toAdminUser(row) {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    isActive: row.is_active,
    maxPortfolios: row.max_portfolios,
    portfoliosCount: row.portfolios_count ?? 0,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
  }
}

async function findUser(id) {
  const [row] = await sql`
    SELECT u.*, (SELECT count(*)::int FROM portfolios p WHERE p.owner_id = u.id) AS portfolios_count
    FROM users u WHERE u.id = ${id}
  `
  if (!row) throw new HttpError(404, 'Usuario no encontrado', 'NOT_FOUND')
  return row
}

// ---------- Usuarios ---------------------------------------------------------

async function listUsers(req, res) {
  const { q } = listUsersSchema.parse(req.query)
  const pattern = q ? `%${q.replace(/[\\%_]/g, '\\$&')}%` : null

  const rows = await sql`
    SELECT u.*, (SELECT count(*)::int FROM portfolios p WHERE p.owner_id = u.id) AS portfolios_count
    FROM users u
    WHERE ${pattern}::text IS NULL
       OR u.full_name ILIKE ${pattern}
       OR u.email::text ILIKE ${pattern}
    ORDER BY u.role, u.full_name
    LIMIT 500
  `
  return sendJson(res, 200, { users: rows.map(toAdminUser) })
}

async function createUser(req, res, admin) {
  const data = createUserSchema.parse(readBody(req))
  const id = crypto.randomUUID()
  const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS)

  try {
    // Usuario + bitácora en una sola transacción.
    const [[row]] = await sql.transaction([
      sql`
        INSERT INTO users (id, email, full_name, password_hash, role, max_portfolios, created_by)
        VALUES (${id}, ${data.email}, ${data.fullName}, ${passwordHash}, ${data.role}, ${data.maxPortfolios}, ${admin.id})
        RETURNING *
      `,
      auditQuery(admin, 'CREATE_USER', 'user', id, {
        email: data.email,
        fullName: data.fullName,
        role: data.role,
        maxPortfolios: data.maxPortfolios,
      }),
    ])
    return sendJson(res, 201, { user: toAdminUser(row) })
  } catch (error) {
    if (error.code === '23505' && error.constraint === 'users_email_key') {
      throw new HttpError(409, 'Ya existe un usuario con ese correo', 'EMAIL_TAKEN')
    }
    throw error
  }
}

async function updateUser(req, res, admin) {
  const user = await findUser(idSchema.parse(req.query.id))
  const data = updateUserSchema.parse(readBody(req))
  const has = (key) => Object.hasOwn(data, key)
  const isSelf = user.id === admin.id

  // Protecciones para no dejar el sistema sin administradores.
  if (isSelf && has('isActive') && !data.isActive) {
    throw new HttpError(400, 'No puedes desactivar tu propia cuenta', 'SELF_LOCKOUT')
  }
  if (isSelf && has('role') && data.role !== 'admin') {
    throw new HttpError(400, 'No puedes quitarte el rol de administrador', 'SELF_LOCKOUT')
  }
  const losesAdmin =
    user.role === 'admin' && user.is_active && ((has('role') && data.role !== 'admin') || (has('isActive') && !data.isActive))
  if (losesAdmin) {
    const [{ count }] = await sql`
      SELECT count(*)::int AS count FROM users WHERE role = 'admin' AND is_active AND id <> ${user.id}
    `
    if (count === 0) throw new HttpError(400, 'Debe quedar al menos un administrador activo', 'LAST_ADMIN')
  }

  // Solo se registran los campos que realmente cambian.
  const before = {
    fullName: user.full_name,
    role: user.role,
    maxPortfolios: user.max_portfolios,
    isActive: user.is_active,
  }
  const changes = Object.fromEntries(
    Object.entries(data).filter(([key, value]) => before[key] !== value).map(([key, value]) => [key, { from: before[key], to: value }]),
  )
  if (Object.keys(changes).length === 0) {
    return sendJson(res, 200, { user: toAdminUser(user) })
  }

  const action =
    Object.keys(changes).length === 1 && changes.isActive
      ? data.isActive
        ? 'ACTIVATE_USER'
        : 'DEACTIVATE_USER'
      : 'UPDATE_USER'

  const [[row]] = await sql.transaction([
    sql`
      UPDATE users SET
        full_name      = CASE WHEN ${has('fullName')}      THEN ${data.fullName ?? null}      ELSE full_name      END,
        role           = CASE WHEN ${has('role')}          THEN ${data.role ?? null}::user_role ELSE role         END,
        max_portfolios = CASE WHEN ${has('maxPortfolios')} THEN ${data.maxPortfolios ?? null}::smallint ELSE max_portfolios END,
        is_active      = CASE WHEN ${has('isActive')}      THEN ${data.isActive ?? null}::boolean ELSE is_active END
      WHERE id = ${user.id}
      RETURNING *, (SELECT count(*)::int FROM portfolios p WHERE p.owner_id = users.id) AS portfolios_count
    `,
    auditQuery(admin, action, 'user', user.id, { email: user.email, changes }),
  ])
  return sendJson(res, 200, { user: toAdminUser(row) })
}

async function resetPassword(req, res, admin) {
  const user = await findUser(idSchema.parse(req.query.id))
  const { password } = resetPasswordSchema.parse(readBody(req))
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)

  await sql.transaction([
    sql`UPDATE users SET password_hash = ${passwordHash} WHERE id = ${user.id}`,
    // Nunca se guarda la contraseña en la bitácora.
    auditQuery(admin, 'RESET_PASSWORD', 'user', user.id, { email: user.email }),
  ])
  return sendJson(res, 200, { ok: true })
}

// ---------- Portafolios (moderación) ------------------------------------------

function toAdminPortfolio(row) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle,
    status: row.status,
    blockedReason: row.blocked_reason,
    blockedAt: row.blocked_at,
    blockedByName: row.blocked_by_name ?? null,
    owner: {
      id: row.owner_id,
      fullName: row.owner_name,
      email: row.owner_email,
      isActive: row.owner_active,
    },
    sectionsCount: row.sections_count,
    postsCount: row.posts_count,
    filesCount: row.files_count,
    filesSize: Number(row.files_size),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/** Portafolios con dueño y estadísticas. `where` filtra por id si se indica. */
function portfoliosQuery({ id = null, pattern = null, status = 'all' }) {
  return sql`
    SELECT
      p.*,
      u.full_name AS owner_name, u.email AS owner_email, u.is_active AS owner_active,
      b.full_name AS blocked_by_name,
      (SELECT count(*)::int FROM sections s WHERE s.portfolio_id = p.id) AS sections_count,
      st.posts_count, st.files_count, st.files_size
    FROM portfolios p
    JOIN users u ON u.id = p.owner_id
    LEFT JOIN users b ON b.id = p.blocked_by
    CROSS JOIN LATERAL (
      SELECT
        count(DISTINCT po.id)::int        AS posts_count,
        count(f.id)::int                  AS files_count,
        COALESCE(sum(f.size_bytes), 0)    AS files_size
      FROM sections s
      JOIN subsections ss ON ss.section_id = s.id
      JOIN posts po ON po.subsection_id = ss.id
      LEFT JOIN post_files f ON f.post_id = po.id
      WHERE s.portfolio_id = p.id
    ) st
    WHERE (${id}::uuid IS NULL OR p.id = ${id}::uuid)
      AND (${status} = 'all' OR p.status::text = ${status})
      AND (
        ${pattern}::text IS NULL
        OR p.title ILIKE ${pattern} OR p.slug ILIKE ${pattern}
        OR u.full_name ILIKE ${pattern} OR u.email::text ILIKE ${pattern}
      )
    ORDER BY (p.status = 'blocked') DESC, p.updated_at DESC
    LIMIT 500
  `
}

async function findPortfolio(id) {
  const [row] = await portfoliosQuery({ id })
  if (!row) throw new HttpError(404, 'Portafolio no encontrado', 'NOT_FOUND')
  return row
}

async function listPortfolios(req, res) {
  const { q, status } = listPortfoliosSchema.parse(req.query)
  const pattern = q ? `%${q.replace(/[\\%_]/g, '\\$&')}%` : null
  const rows = await portfoliosQuery({ pattern, status })
  return sendJson(res, 200, { portfolios: rows.map(toAdminPortfolio) })
}

async function blockPortfolio(req, res, admin) {
  const portfolio = await findPortfolio(idSchema.parse(req.query.id))
  const { reason } = blockPortfolioSchema.parse(readBody(req))
  if (portfolio.status === 'blocked') {
    throw new HttpError(409, 'El portafolio ya está bloqueado', 'ALREADY_BLOCKED')
  }

  await sql.transaction([
    sql`
      UPDATE portfolios
      SET status = 'blocked', blocked_reason = ${reason}, blocked_at = now(), blocked_by = ${admin.id}
      WHERE id = ${portfolio.id}
    `,
    auditQuery(admin, 'BLOCK_PORTFOLIO', 'portfolio', portfolio.id, {
      slug: portfolio.slug,
      title: portfolio.title,
      ownerEmail: portfolio.owner_email,
      reason,
    }),
  ])
  return sendJson(res, 200, { portfolio: toAdminPortfolio(await findPortfolio(portfolio.id)) })
}

async function unblockPortfolio(req, res, admin) {
  const portfolio = await findPortfolio(idSchema.parse(req.query.id))
  if (portfolio.status !== 'blocked') {
    throw new HttpError(409, 'El portafolio no está bloqueado', 'NOT_BLOCKED')
  }

  await sql.transaction([
    sql`
      UPDATE portfolios
      SET status = 'active', blocked_reason = NULL, blocked_at = NULL, blocked_by = NULL
      WHERE id = ${portfolio.id}
    `,
    auditQuery(admin, 'UNBLOCK_PORTFOLIO', 'portfolio', portfolio.id, {
      slug: portfolio.slug,
      title: portfolio.title,
      ownerEmail: portfolio.owner_email,
      previousReason: portfolio.blocked_reason,
    }),
  ])
  return sendJson(res, 200, { portfolio: toAdminPortfolio(await findPortfolio(portfolio.id)) })
}

async function deletePortfolio(req, res, admin) {
  const portfolio = await findPortfolio(idSchema.parse(req.query.id))

  // Claves del bucket antes de que la cascada borre las filas.
  const keys = (await sql`SELECT storage_key FROM portfolio_storage_keys(${portfolio.id})`).map((r) => r.storage_key)

  await sql.transaction([
    sql`DELETE FROM portfolios WHERE id = ${portfolio.id}`,
    auditQuery(admin, 'DELETE_PORTFOLIO', 'portfolio', portfolio.id, {
      slug: portfolio.slug,
      title: portfolio.title,
      ownerEmail: portfolio.owner_email,
      sections: portfolio.sections_count,
      posts: portfolio.posts_count,
      files: portfolio.files_count,
    }),
  ])

  const failed = await deleteStorageObjects(keys)
  if (failed.length > 0) {
    console.error(`[admin] ${failed.length} archivo(s) huérfano(s) del portafolio ${portfolio.id}:`, failed)
  }
  return sendJson(res, 200, { ok: true, filesDeleted: keys.length - failed.length, filesFailed: failed.length })
}

// ---------- Bitácora ----------------------------------------------------------

async function listActions(req, res) {
  const { targetType, action, q, before, limit } = listActionsSchema.parse(req.query)
  const pattern = q ? `%${q.replace(/[\\%_]/g, '\\$&')}%` : null

  // Se pide una fila de más para saber si hay otra página.
  const rows = await sql`
    SELECT a.id, a.action, a.target_type, a.target_id, a.details, a.created_at,
           a.admin_id, u.full_name AS admin_name, u.email AS admin_email
    FROM admin_actions a
    LEFT JOIN users u ON u.id = a.admin_id
    WHERE (${targetType} = 'all' OR a.target_type = ${targetType})
      AND (${action} = 'all' OR a.action = ${action})
      AND (${before ?? null}::bigint IS NULL OR a.id < ${before ?? null}::bigint)
      AND (
        ${pattern}::text IS NULL
        OR a.details::text ILIKE ${pattern}
        OR u.full_name ILIKE ${pattern}
        OR u.email::text ILIKE ${pattern}
      )
    ORDER BY a.id DESC
    LIMIT ${limit + 1}
  `

  const hasMore = rows.length > limit
  const page = rows.slice(0, limit)
  return sendJson(res, 200, {
    actions: page.map((row) => ({
      id: Number(row.id),
      action: row.action,
      targetType: row.target_type,
      targetId: row.target_id,
      details: row.details,
      createdAt: row.created_at,
      // admin_id queda en NULL si el administrador fue eliminado.
      admin: row.admin_id ? { id: row.admin_id, fullName: row.admin_name, email: row.admin_email } : null,
    })),
    nextCursor: hasMore ? Number(page.at(-1).id) : null,
  })
}

// ---------- Enrutado -----------------------------------------------------

const routes = {
  users: {
    GET: listUsers,
    POST: (req, res, admin) => {
      if (req.query.action === 'reset-password') return resetPassword(req, res, admin)
      if (req.query.action) throw new HttpError(404, 'Acción no encontrada', 'NOT_FOUND')
      return createUser(req, res, admin)
    },
    PATCH: updateUser,
  },
  portfolios: {
    GET: listPortfolios,
    PATCH: (req, res, admin) => {
      if (req.query.action === 'block') return blockPortfolio(req, res, admin)
      if (req.query.action === 'unblock') return unblockPortfolio(req, res, admin)
      throw new HttpError(404, 'Acción no encontrada', 'NOT_FOUND')
    },
    DELETE: deletePortfolio,
  },
  actions: {
    GET: listActions,
  },
}

function dispatch(method) {
  return async (req, res) => {
    const admin = await requireAdmin(req)
    const fn = routes[req.query.resource]?.[method]
    if (!fn) throw new HttpError(404, 'Ruta no encontrada', 'NOT_FOUND')
    return fn(req, res, admin)
  }
}

export default createHandler({
  GET: dispatch('GET'),
  POST: dispatch('POST'),
  PATCH: dispatch('PATCH'),
  DELETE: dispatch('DELETE'),
})
