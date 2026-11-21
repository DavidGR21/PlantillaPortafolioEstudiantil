import bcrypt from 'bcryptjs'
import { sql } from './_lib/db.js'
import { requireAdmin } from './_lib/auth.js'
import { auditQuery } from './_lib/audit.js'
import { createHandler, HttpError, readBody, sendJson } from './_lib/http.js'
import {
  createUserSchema,
  idSchema,
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
 * (Portafolios y bitácora se agregan en los pasos 16 y 17.)
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
})
