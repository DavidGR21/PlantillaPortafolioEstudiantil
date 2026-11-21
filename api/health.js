import { sql } from './_lib/db.js'

// GET /api/health -> comprueba que la API responde y que Neon está accesible.
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ ok: false, error: 'Método no permitido' })
  }

  try {
    const [row] = await sql`SELECT now() AS db_time`
    return res.status(200).json({ ok: true, database: 'connected', dbTime: row.db_time })
  } catch (error) {
    console.error('[health] Error de base de datos:', error)
    return res.status(503).json({ ok: false, database: 'unreachable' })
  }
}
