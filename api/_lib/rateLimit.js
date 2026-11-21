import { sql } from './db.js'
import { HttpError } from './http.js'

/*
 * Límite de intentos de inicio de sesión (fuerza bruta).
 * - Por correo: 5 fallos en 15 min (se cuentan desde el último acceso correcto).
 * - Por IP: 30 fallos en 15 min (evita probar muchos correos desde un mismo equipo).
 * Se aplica igual a correos que existen y que no, para no revelar cuáles están registrados.
 */

export const WINDOW_MINUTES = 15
export const MAX_FAILURES_PER_EMAIL = 5
export const MAX_FAILURES_PER_IP = 30

/** IP del cliente (Vercel la envía en x-forwarded-for / x-real-ip). */
export function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for']
  if (forwarded) return String(forwarded).split(',')[0].trim()
  return String(req.headers['x-real-ip'] ?? req.socket?.remoteAddress ?? 'desconocida')
}

/** Lanza 429 si el correo o la IP superaron el límite de fallos. */
export async function assertLoginAllowed(email, ip) {
  const [row] = await sql`
    WITH last_success AS (
      SELECT max(created_at) AS at FROM login_attempts WHERE email = ${email} AND success
    )
    SELECT
      (SELECT count(*)::int FROM login_attempts
        WHERE email = ${email} AND NOT success
          AND created_at > greatest(now() - make_interval(mins => ${WINDOW_MINUTES}),
                                    COALESCE((SELECT at FROM last_success), '-infinity'))) AS email_failures,
      (SELECT min(created_at) FROM login_attempts
        WHERE email = ${email} AND NOT success
          AND created_at > now() - make_interval(mins => ${WINDOW_MINUTES})) AS email_oldest,
      (SELECT count(*)::int FROM login_attempts
        WHERE ip = ${ip} AND NOT success
          AND created_at > now() - make_interval(mins => ${WINDOW_MINUTES})) AS ip_failures
  `

  if (row.email_failures >= MAX_FAILURES_PER_EMAIL || row.ip_failures >= MAX_FAILURES_PER_IP) {
    // Minutos hasta que caduque el fallo más antiguo de la ventana (mínimo 1).
    const oldest = row.email_oldest ? new Date(row.email_oldest).getTime() : Date.now()
    const retryMs = oldest + WINDOW_MINUTES * 60_000 - Date.now()
    const minutes = Math.max(1, Math.ceil(retryMs / 60_000))
    const error = new HttpError(
      429,
      `Demasiados intentos fallidos. Espera ${minutes} minuto${minutes === 1 ? '' : 's'} e inténtalo de nuevo.`,
      'TOO_MANY_ATTEMPTS',
    )
    error.retryAfter = minutes * 60
    throw error
  }
}

/** Registra un intento y, de paso, limpia los registros de más de 1 día. */
export async function recordLoginAttempt(email, ip, success) {
  await sql.transaction([
    sql`INSERT INTO login_attempts (email, ip, success) VALUES (${email}, ${ip}, ${success})`,
    sql`DELETE FROM login_attempts WHERE created_at < now() - interval '1 day'`,
  ])
}
