import { z } from 'zod'

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string({ error: 'Escribe tu contraseña actual' })
      .min(1, { error: 'Escribe tu contraseña actual' })
      .max(200),
    newPassword: z
      .string({ error: 'Escribe la nueva contraseña' })
      .min(8, { error: 'La nueva contraseña debe tener al menos 8 caracteres' })
      .max(200, { error: 'La nueva contraseña es demasiado larga' }),
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    error: 'La nueva contraseña debe ser distinta de la actual',
    path: ['newPassword'],
  })

export const loginSchema = z.object({
  email: z
    .string({ error: 'El correo es obligatorio' })
    .trim()
    .toLowerCase()
    .pipe(z.email({ error: 'Correo no válido' })),
  password: z
    .string({ error: 'La contraseña es obligatoria' })
    .min(1, { error: 'La contraseña es obligatoria' })
    .max(200, { error: 'Contraseña demasiado larga' }),
})
