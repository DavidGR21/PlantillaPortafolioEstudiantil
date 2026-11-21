import jwt from 'jsonwebtoken'
import { parseCookie, stringifySetCookie } from 'cookie'
import { sql } from './db.js'
import { HttpError } from './http.js'

const COOKIE_NAME = 'pp_session'
const JWT_ALGORITHM = 'HS256'
const JWT_SECRET = process.env.JWT_SECRET
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET no está definido o es demasiado corto (mínimo 32 caracteres)')
}

// En local (vercel dev) se usa http, en Vercel siempre https.
const isSecure = process.env.NODE_ENV === 'production'

/** Forma pública del usuario que se envía al frontend (nunca el hash). */
export function toPublicUser(row) {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    maxPortfolios: row.max_portfolios,
  }
}

// ---------- Token y cookie ---------------------------------------------

export function createSessionToken(user) {
  return jwt.sign({ role: user.role }, JWT_SECRET, {
    algorithm: JWT_ALGORITHM,
    subject: user.id,
    expiresIn: JWT_EXPIRES_IN,
  })
}

export function setSessionCookie(res, token) {
  const { exp } = jwt.decode(token)
  res.setHeader(
    'Set-Cookie',
    stringifySetCookie({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      path: '/',
      maxAge: Math.max(0, exp - Math.floor(Date.now() / 1000)),
    }),
  )
}

export function clearSessionCookie(res) {
  res.setHeader(
    'Set-Cookie',
    stringifySetCookie({
      name: COOKIE_NAME,
      value: '',
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    }),
  )
}

function readToken(req) {
  const header = req.headers.cookie
  if (!header) return null
  return parseCookie(header)[COOKIE_NAME] || null
}

// ---------- Usuario de la sesión ---------------------------------------

/**
 * Devuelve el usuario de la sesión o null.
 * Se consulta la BD en cada petición para que desactivar a un usuario
 * (o cambiar su rol) tenga efecto inmediato, aunque su JWT siga vigente.
 * Una sesión iniciada ANTES del último cambio de contraseña ya no es válida.
 */
export async function getSessionUser(req) {
  const token = readToken(req)
  if (!token) return null

  let payload
  try {
    payload = jwt.verify(token, JWT_SECRET, { algorithms: [JWT_ALGORITHM] })
  } catch {
    return null
  }

  const [row] = await sql`
    SELECT id, email, full_name, role, max_portfolios, is_active, password_changed_at
    FROM users
    WHERE id = ${payload.sub}
  `
  if (!row || !row.is_active) return null
  if (row.password_changed_at && payload.iat < Math.floor(new Date(row.password_changed_at).getTime() / 1000)) {
    return null
  }
  return toPublicUser(row)
}

/** Exige sesión iniciada. Lanza 401 si no la hay. */
export async function requireUser(req) {
  const user = await getSessionUser(req)
  if (!user) throw new HttpError(401, 'Debes iniciar sesión', 'UNAUTHENTICATED')
  return user
}

/** Exige rol administrador. Lanza 401/403. */
export async function requireAdmin(req) {
  const user = await requireUser(req)
  if (user.role !== 'admin') {
    throw new HttpError(403, 'Acceso restringido a administradores', 'FORBIDDEN')
  }
  return user
}
