import bcrypt from 'bcryptjs'
import { sql } from './_lib/db.js'
import { createHandler, HttpError, readBody, sendJson } from './_lib/http.js'
import {
  clearSessionCookie,
  createSessionToken,
  getSessionUser,
  setSessionCookie,
  toPublicUser,
} from './_lib/auth.js'
import { loginSchema } from './_lib/validators/auth.js'

/*
 * /api/auth?action=login   POST  { email, password }  -> { user }  + cookie
 * /api/auth?action=logout  POST  {}                   -> { ok }    borra cookie
 * /api/auth?action=me      GET                        -> { user }  (user = null si no hay sesión)
 */

// Hash válido de una contraseña aleatoria: se compara contra él cuando el
// correo no existe, para que la respuesta tarde lo mismo y no revele qué
// correos están registrados.
const DUMMY_HASH = bcrypt.hashSync(crypto.randomUUID(), 10)
const INVALID_CREDENTIALS = 'Correo o contraseña incorrectos'

async function login(req, res) {
  const { email, password } = loginSchema.parse(readBody(req))

  const [row] = await sql`
    SELECT id, email, full_name, role, max_portfolios, is_active, password_hash
    FROM users
    WHERE email = ${email}
  `

  const passwordOk = await bcrypt.compare(password, row?.password_hash ?? DUMMY_HASH)
  if (!row || !passwordOk) {
    throw new HttpError(401, INVALID_CREDENTIALS, 'INVALID_CREDENTIALS')
  }
  if (!row.is_active) {
    throw new HttpError(403, 'Tu cuenta está desactivada. Contacta al administrador.', 'ACCOUNT_DISABLED')
  }

  await sql`UPDATE users SET last_login_at = now() WHERE id = ${row.id}`

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

const actionsByMethod = {
  GET: { me },
  POST: { login, logout },
}

function dispatch(method) {
  return (req, res) => {
    const action = actionsByMethod[method][req.query.action]
    if (!action) throw new HttpError(404, 'Acción no encontrada', 'NOT_FOUND')
    return action(req, res)
  }
}

export default createHandler({
  GET: dispatch('GET'),
  POST: dispatch('POST'),
})
