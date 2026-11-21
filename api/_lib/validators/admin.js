import { z } from 'zod'

export { idSchema } from './portfolio.js'

export const passwordSchema = z
  .string({ error: 'La contraseña es obligatoria' })
  .min(8, { error: 'La contraseña debe tener al menos 8 caracteres' })
  .max(200, { error: 'La contraseña es demasiado larga' })

const fullName = z
  .string({ error: 'El nombre es obligatorio' })
  .trim()
  .min(2, { error: 'El nombre debe tener al menos 2 caracteres' })
  .max(150, { error: 'El nombre no puede superar 150 caracteres' })

const role = z.enum(['admin', 'student'], { error: 'Rol no válido' })

const maxPortfolios = z
  .number({ error: 'El límite de portafolios debe ser un número' })
  .int({ error: 'El límite de portafolios debe ser un número entero' })
  .min(0, { error: 'El límite no puede ser negativo' })
  .max(20, { error: 'El límite máximo es 20 portafolios' })

export const createUserSchema = z.object({
  email: z
    .string({ error: 'El correo es obligatorio' })
    .trim()
    .toLowerCase()
    .pipe(z.email({ error: 'Correo no válido' })),
  fullName,
  password: passwordSchema,
  role: role.default('student'),
  maxPortfolios: maxPortfolios.default(3),
})

export const updateUserSchema = z
  .object({ fullName, role, maxPortfolios, isActive: z.boolean({ error: 'Estado no válido' }) })
  .partial()
  .refine((data) => Object.keys(data).length > 0, { error: 'No hay cambios para guardar' })

export const resetPasswordSchema = z.object({ password: passwordSchema })

export const listUsersSchema = z.object({
  q: z.string().trim().max(100).optional(),
})

// ---------- Portafolios (moderación) ------------------------------------------

export const listPortfoliosSchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.enum(['all', 'active', 'blocked'], { error: 'Estado no válido' }).default('all'),
})

// ---------- Bitácora ----------------------------------------------------------

export const AUDIT_ACTIONS = [
  'CREATE_USER',
  'UPDATE_USER',
  'ACTIVATE_USER',
  'DEACTIVATE_USER',
  'RESET_PASSWORD',
  'BLOCK_PORTFOLIO',
  'UNBLOCK_PORTFOLIO',
  'DELETE_PORTFOLIO',
]

export const listActionsSchema = z.object({
  targetType: z.enum(['all', 'user', 'portfolio'], { error: 'Tipo no válido' }).default('all'),
  action: z.enum(['all', ...AUDIT_ACTIONS], { error: 'Acción no válida' }).default('all'),
  q: z.string().trim().max(100).optional(),
  // Paginación: id de la última fila recibida; se devuelven las anteriores a ella.
  before: z.coerce.number({ error: 'Cursor no válido' }).int().positive().optional(),
  limit: z.coerce
    .number({ error: 'Límite no válido' })
    .int({ error: 'Límite no válido' })
    .min(1, { error: 'El límite mínimo es 1' })
    .max(100, { error: 'El límite máximo es 100' })
    .default(50),
})

export const blockPortfolioSchema = z.object({
  reason: z
    .string({ error: 'Indica el motivo del bloqueo' })
    .trim()
    .min(3, { error: 'Indica el motivo del bloqueo (mínimo 3 caracteres)' })
    .max(500, { error: 'El motivo no puede superar 500 caracteres' }),
})
