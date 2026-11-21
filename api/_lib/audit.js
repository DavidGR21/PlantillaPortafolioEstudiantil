import { sql } from './db.js'

/**
 * Consulta (sin ejecutar) que registra una acción del administrador en la bitácora.
 * Se devuelve la consulta para poder incluirla en una transacción:
 *   await sql.transaction([sql`UPDATE ...`, auditQuery(admin, 'BLOCK_PORTFOLIO', ...)])
 */
export function auditQuery(admin, action, targetType, targetId, details = {}) {
  return sql`
    INSERT INTO admin_actions (admin_id, action, target_type, target_id, details)
    VALUES (${admin.id}, ${action}, ${targetType}, ${targetId}, ${JSON.stringify(details)}::jsonb)
  `
}
