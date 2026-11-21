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

export const blockPortfolioSchema = z.object({
  reason: z
    .string({ error: 'Indica el motivo del bloqueo' })
    .trim()
    .min(3, { error: 'Indica el motivo del bloqueo (mínimo 3 caracteres)' })
    .max(500, { error: 'El motivo no puede superar 500 caracteres' }),
})
