import { z } from 'zod'

// Igual que el CHECK de la BD: minúsculas, números y guiones; 3-60 caracteres;
// sin guion al inicio ni al final.
export const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$/

export const slugSchema = z
  .string({ error: 'La dirección (URL) es obligatoria' })
  .trim()
  .toLowerCase()
  .min(3, { error: 'La dirección debe tener al menos 3 caracteres' })
  .max(60, { error: 'La dirección no puede superar 60 caracteres' })
  .regex(SLUG_REGEX, {
    error: 'La dirección solo puede tener letras minúsculas, números y guiones (sin guion al inicio o al final)',
  })

export const idSchema = z.uuid({ error: 'Identificador no válido' })

/** Texto opcional: '' o solo espacios se guarda como null. */
const optionalText = (max, label) =>
  z
    .string()
    .trim()
    .max(max, { error: `${label} no puede superar ${max} caracteres` })
    .transform((v) => (v === '' ? null : v))
    .nullish()

const titleSchema = z
  .string({ error: 'El título es obligatorio' })
  .trim()
  .min(1, { error: 'El título es obligatorio' })
  .max(150, { error: 'El título no puede superar 150 caracteres' })

// Colores/opciones visuales de la plantilla. Se valida que sea un objeto plano y pequeño.
const themeSchema = z
  .record(z.string().max(50), z.union([z.string().max(200), z.number(), z.boolean(), z.null()]))
  .refine((obj) => Object.keys(obj).length <= 30, { error: 'Demasiadas opciones de tema' })

export const createPortfolioSchema = z.object({
  slug: slugSchema,
  title: titleSchema,
  subtitle: optionalText(255, 'El subtítulo'),
  description: optionalText(5000, 'La descripción'),
})

export const updatePortfolioSchema = z
  .object({
    slug: slugSchema,
    title: titleSchema,
    subtitle: optionalText(255, 'El subtítulo'),
    description: optionalText(5000, 'La descripción'),
    theme: themeSchema,
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, { error: 'No hay cambios para guardar' })
