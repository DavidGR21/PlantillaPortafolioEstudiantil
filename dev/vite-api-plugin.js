import { existsSync } from 'node:fs'
import path from 'node:path'
import { loadEnv } from 'vite'

/**
 * Plugin SOLO para desarrollo: sirve las funciones de /api dentro del
 * servidor de Vite, imitando a Vercel (req.query, req.body, res.status, res.json).
 * Así `npm run dev` levanta frontend + API sin necesitar `vercel dev`.
 * En producción no se usa: Vercel ejecuta /api directamente.
 */
export function vercelApiDev() {
  let root

  return {
    name: 'vercel-api-dev',
    apply: 'serve',

    configResolved(config) {
      root = config.root
      // Carga TODAS las variables de .env (no solo VITE_*) para las funciones de /api.
      const env = loadEnv(config.mode, root, '')
      for (const [key, value] of Object.entries(env)) {
        if (process.env[key] === undefined) process.env[key] = value
      }
    },

    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, 'http://localhost')
        if (!url.pathname.startsWith('/api/')) return next()

        const name = url.pathname.slice('/api/'.length).replace(/\/+$/, '')
        const file = path.join(root, 'api', `${name}.js`)

        // Las carpetas que empiezan con "_" (como _lib) no son rutas, igual que en Vercel.
        if (!name || name.split('/').some((part) => part.startsWith('_') || part === '..') || !existsSync(file)) {
          res.statusCode = 404
          res.setHeader('Content-Type', 'application/json')
          return res.end(JSON.stringify({ error: `Ruta de API no encontrada: ${url.pathname}` }))
        }

        let raw = ''
        for await (const chunk of req) raw += chunk

        req.query = Object.fromEntries(url.searchParams)
        const type = req.headers['content-type'] || ''
        if (type.includes('application/json') && raw) {
          try {
            req.body = JSON.parse(raw)
          } catch {
            req.body = raw
          }
        } else {
          req.body = raw || undefined
        }

        res.status = (code) => {
          res.statusCode = code
          return res
        }
        res.json = (body) => {
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify(body))
          return res
        }

        try {
          const mod = await server.ssrLoadModule(file)
          await mod.default(req, res)
        } catch (error) {
          console.error(`[api] ${req.method} ${url.pathname}`, error)
          if (!res.headersSent) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Error interno del servidor (ver consola de Vite)' }))
          }
        }
      })
    },
  }
}
