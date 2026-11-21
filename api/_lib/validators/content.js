import { z } from 'zod'

export { idSchema } from './portfolio.js'

// Slugs de apartado que chocan con rutas del frontend (/p/:slug/editar).
export const RESERVED_SECTION_SLUGS = new Set(['editar'])

export const MAX_SECTIONS_PER_PORTFOLIO = 20

const sectionTitle = z
  .string({ error: 'El nombre del apartado es obligatorio' })
  .trim()
  .min(1, { error: 'El nombre del apartado es obligatorio' })
  .max(100, { error: 'El nombre no puede superar 100 caracteres' })

export const createSectionSchema = z.object({
  portfolioId: z.uuid({ error: 'Portafolio no válido' }),
  title: sectionTitle,
})

export const updateSectionSchema = z.object({
  title: sectionTitle,
})

export const reorderSchema = z.object({
  portfolioId: z.uuid({ error: 'Portafolio no válido' }),
  ids: z
    .array(z.uuid({ error: 'Identificador no válido' }))
    .min(1, { error: 'La lista está vacía' })
    .max(200)
    .refine((ids) => new Set(ids).size === ids.length, { error: 'La lista tiene elementos repetidos' }),
})
