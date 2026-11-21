import { z } from 'zod'

export { idSchema } from './portfolio.js'

const MB = 1024 * 1024

/** Tipos permitidos -> tipo de archivo y tamaño máximo (igual que el CHECK de la BD). */
export const ALLOWED_TYPES = {
  'application/pdf': { kind: 'pdf', maxSize: 50 * MB },
  'image/jpeg': { kind: 'image', maxSize: 10 * MB },
  'image/png': { kind: 'image', maxSize: 10 * MB },
  'image/webp': { kind: 'image', maxSize: 10 * MB },
  'image/gif': { kind: 'image', maxSize: 10 * MB },
}

export const MAX_FILES_PER_POST = 20

const fileName = z
  .string({ error: 'El nombre del archivo es obligatorio' })
  .trim()
  .min(1, { error: 'El nombre del archivo es obligatorio' })
  .max(255, { error: 'El nombre del archivo es demasiado largo' })

const mimeType = z.enum(Object.keys(ALLOWED_TYPES), {
  error: 'Tipo de archivo no permitido. Solo PDF, JPG, PNG, WEBP o GIF.',
})

export const presignSchema = z
  .object({
    postId: z.uuid({ error: 'Publicación no válida' }),
    fileName,
    mimeType,
    size: z.number({ error: 'Tamaño no válido' }).int().positive({ error: 'El archivo está vacío' }),
  })
  .superRefine((data, ctx) => {
    const { maxSize, kind } = ALLOWED_TYPES[data.mimeType]
    if (data.size > maxSize) {
      ctx.addIssue({
        code: 'custom',
        path: ['size'],
        message: `El archivo supera el máximo de ${maxSize / MB} MB para ${kind === 'pdf' ? 'PDF' : 'imágenes'}.`,
      })
    }
  })

export const registerSchema = z.object({
  postId: z.uuid({ error: 'Publicación no válida' }),
  key: z.string().min(1).max(500),
  fileName,
  mimeType,
})
