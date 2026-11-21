import { sql } from './_lib/db.js'
import { createHandler, sendJson } from './_lib/http.js'
import { checkStorage } from './_lib/storage.js'

// GET /api/health -> comprueba que la API responde y que Neon (BD y bucket) está accesible.
export default createHandler({
  GET: async (req, res) => {
    const [database, storage] = await Promise.all([
      sql`SELECT 1`.then(
        () => 'connected',
        (error) => {
          console.error('[health] Error de base de datos:', error)
          return 'unreachable'
        },
      ),
      checkStorage().then(
        () => 'connected',
        (error) => {
          console.error('[health] Error del bucket:', error)
          return 'unreachable'
        },
      ),
    ])

    const ok = database === 'connected' && storage === 'connected'
    return sendJson(res, ok ? 200 : 503, { ok, database, storage })
  },
})
