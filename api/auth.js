import bcrypt from 'bcryptjs'
import { sql } from './_lib/db.js'
import { createHandler, HttpError, readBody, sendJson } from './_lib/http.js'
import {
  clearSessionCookie,
  createSessionToken,
  getSessionUser,
  requireUser,
  setSessionCookie,
  toPublicUser,
} from './_lib/auth.js'
import { assertLoginAllowed, getClientIp, recordLoginAttempt } from './_lib/rateLimit.js'
import { changePasswordSchema, loginSchema } from './_lib/validators/auth.js'

/*
 * /api/auth?action=login            POST  { email, password }                 -> { user }  + cookie
 * /api/auth?action=logout           POST  {}                                  -> { ok }    borra cookie
 * /api/auth?action=me               GET                                       -> { user }  (null si no hay sesión)
 * /api/auth?action=change-password  POST  { currentPassword, newPassword }    -> { ok }    + cookie nueva
 *
 * login y change-password tienen límite de intentos fallidos (api/_lib/rateLimit.js).
 */

const BCRYPT_ROUNDS = 10

// Hash válido de una contraseña aleatoria: se compara contra él cuando el
// correo no existe, para que la respuesta tarde lo mismo y no revele qué
// correos están registrados.
const DUMMY_HASH = bcrypt.hashSync(crypto.randomUUID(), BCRYPT_ROUNDS)
const INVALID_CREDENTIALS = 'Correo o contraseña incorrectos'

async function login(req, res) {
  const { email, password } = loginSchema.parse(readBody(req))
  const ip = getClientIp(req)
  await assertLoginAllowed(email, ip)

  const [row] = await sql`
    SELECT id, email, full_name, role, max_portfolios, is_active, password_hash
    FROM users
    WHERE email = ${email}
  `

  const passwordOk = await bcrypt.compare(password, row?.password_hash ?? DUMMY_HASH)
  if (!row || !passwordOk) {
    await recordLoginAttempt(email, ip, false)
    throw new HttpError(401, INVALID_CREDENTIALS, 'INVALID_CREDENTIALS')
  }
  if (!row.is_active) {
    throw new HttpError(403, 'Tu cuenta está desactivada. Contacta al administrador.', 'ACCOUNT_DISABLED')
  }

  await Promise.all([
    sql`UPDATE users SET last_login_at = now() WHERE id = ${row.id}`,
    recordLoginAttempt(email, ip, true),
  ])

  const user = toPublicUser(row)
  setSessionCookie(res, createSessionToken(user))
  return sendJson(res, 200, { user })
}

async function logout(req, res) {
  clearSessionCookie(res)
  return sendJson(res, 200, { ok: true })
}

async function me(req, res) {
  const user = await getSessionUser(req)
  return sendJson(res, 200, { user })
}

async function changePassword(req, res) {
  const user = await requireUser(req)
  const { currentPassword, newPassword } = changePasswordSchema.parse(readBody(req))
  const ip = getClientIp(req)
  await assertLoginAllowed(user.email, ip)

  const [row] = await sql`SELECT password_hash FROM users WHERE id = ${user.id}`
  if (!(await bcrypt.compare(currentPassword, row.password_hash))) {
    await recordLoginAttempt(user.email, ip, false)
    // 400 (no 401): la sesión sigue siendo válida, solo la contraseña actual es incorrecta.
    throw new HttpError(400, 'La contraseña actual no es correcta', 'WRONG_PASSWORD')
  }

  // La hora se toma del servidor y se redondea al segundo, igual que el "iat" del
  // JWT: así la sesión nueva sigue siendo válida y las anteriores dejan de serlo.
  const changedAt = new Date(Math.floor(Date.now() / 1000) * 1000)
  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS)
  await sql`
    UPDATE users SET password_hash = ${passwordHash}, password_changed_at = ${changedAt}
    WHERE id = ${user.id}
  `
  await recordLoginAttempt(user.email, ip, true)

  // Se renueva la cookie de esta sesión; las demás (otros equipos) quedan cerradas.
  setSessionCookie(res, createSessionToken(user))
  return sendJson(res, 200, { ok: true })
}

const actionsByMethod = {
  GET: { me },
  POST: { login, logout, 'change-password': changePassword },
}

function dispatch(method) {
  return (req, res) => {
    // Object.hasOwn: evita que ?action=toString (u otras propiedades heredadas) se ejecuten.
    const actions = actionsByMethod[method]
    if (!Object.hasOwn(actions, req.query.action ?? '')) {
      throw new HttpError(404, 'Acción no encontrada', 'NOT_FOUND')
    }
    return actions[req.query.action](req, res)
  }
}

export default createHandler({
  GET: dispatch('GET'),
  POST: dispatch('POST'),
})
