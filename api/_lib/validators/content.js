import { z } from 'zod'

export { idSchema } from './portfolio.js'

// Slugs de apartado que chocan con rutas del frontend (/p/:slug/editar).
export const RESERVED_SECTION_SLUGS = new Set(['editar'])

export const MAX_SECTIONS_PER_PORTFOLIO = 20
export const MAX_SUBSECTIONS_PER_SECTION = 20

const titleSchema = (label) =>
  z
    .string({ error: `El nombre del ${label} es obligatorio` })
    .trim()
    .min(1, { error: `El nombre del ${label} es obligatorio` })
    .max(100, { error: 'El nombre no puede superar 100 caracteres' })

const parentId = (label) => z.uuid({ error: `${label} no válido` })

const idList = z
  .array(z.uuid({ error: 'Identificador no válido' }))
  .min(1, { error: 'La lista está vacía' })
  .max(200)
  .refine((ids) => new Set(ids).size === ids.length, { error: 'La lista tiene elementos repetidos' })

// ---------- Apartados ----------------------------------------------------
export const createSectionSchema = z.object({
  portfolioId: parentId('Portafolio'),
  title: titleSchema('apartado'),
})

export const updateSectionSchema = z.object({ title: titleSchema('apartado') })

export const reorderSectionsSchema = z.object({ portfolioId: parentId('Portafolio'), ids: idList })

// ---------- Parciales (submódulos) ----------------------------------------
export const createSubsectionSchema = z.object({
  sectionId: parentId('Apartado'),
  title: titleSchema('parcial'),
})

export const updateSubsectionSchema = z.object({ title: titleSchema('parcial') })

export const reorderSubsectionsSchema = z.object({ sectionId: parentId('Apartado'), ids: idList })

// ---------- Publicaciones --------------------------------------------------
export const MAX_POSTS_PER_SUBSECTION = 100

const postTitle = z
  .string({ error: 'El título es obligatorio' })
  .trim()
  .min(1, { error: 'El título es obligatorio' })
  .max(200, { error: 'El título no puede superar 200 caracteres' })

// Opcional: '' o solo espacios se guarda como null.
const postDescription = z
  .string()
  .trim()
  .max(10000, { error: 'La descripción no puede superar 10 000 caracteres' })
  .transform((v) => (v === '' ? null : v))
  .nullish()

export const createPostSchema = z.object({
  subsectionId: parentId('Parcial'),
  title: postTitle,
  description: postDescription,
})

export const updatePostSchema = z
  .object({ title: postTitle, description: postDescription })
  .partial()
  .refine((data) => Object.keys(data).length > 0, { error: 'No hay cambios para guardar' })

export const reorderPostsSchema = z.object({ subsectionId: parentId('Parcial'), ids: idList })
