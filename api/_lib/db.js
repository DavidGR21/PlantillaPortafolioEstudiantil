import { neon } from '@neondatabase/serverless'

if (!process.env.DATABASE_URL) {
  throw new Error('Falta la variable de entorno DATABASE_URL')
}

/**
 * Cliente SQL de Neon (HTTP). Se usa como tagged template:
 *   const rows = await sql`SELECT * FROM users WHERE id = ${id}`
 * Los valores interpolados se envían como parámetros (sin inyección SQL).
 * Para varias consultas atómicas: await sql.transaction([sql`...`, sql`...`])
 */
export const sql = neon(process.env.DATABASE_URL)
