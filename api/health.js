import { sql } from './_lib/db.js'
import { createHandler, sendJson } from './_lib/http.js'

// GET /api/health -> comprueba que la API responde y que Neon está accesible.
export default createHandler({
  GET: async (req, res) => {
    try {
      const [row] = await sql`SELECT now() AS db_time`
      return sendJson(res, 200, { ok: true, database: 'connected', dbTime: row.db_time })
    } catch (error) {
      console.error('[health] Error de base de datos:', error)
      return sendJson(res, 503, { ok: false, database: 'unreachable' })
    }
  },
})
