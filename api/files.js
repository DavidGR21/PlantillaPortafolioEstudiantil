import { sql } from './_lib/db.js'
import { requireUser } from './_lib/auth.js'
import { createHandler, HttpError, readBody, sendJson } from './_lib/http.js'
import { getOwnedFile, getOwnedPortfolio, getOwnedPost, getOwnedSection } from './_lib/ownership.js'
import {
  buildCoverKey,
  buildPostFileKey,
  coverKeyPrefix,
  createDownloadUrl,
  createUploadUrl,
  deleteStorageObjects,
  headStorageObject,
  UPLOAD_URL_TTL,
} from './_lib/storage.js'
import {
  ALLOWED_TYPES,
  coverPresignSchema,
  coverRemoveSchema,
  coverSetSchema,
  idSchema,
  MAX_FILES_PER_POST,
  presignSchema,
  registerSchema,
} from './_lib/validators/files.js'

/*
 * Archivos de las publicaciones (solo el dueño). Flujo de subida:
 *
 *  1) POST   /api/files?action=presign  { postId, fileName, mimeType, size }
 *             -> { uploadUrl, key, expiresIn }
 *  2) El navegador hace PUT del archivo a uploadUrl (directo al bucket) con
 *     Content-Type = mimeType. El bucket rechaza otro tipo u otro tamaño.
 *  3) POST   /api/files                 { postId, key, fileName, mimeType }
 *             -> 201 { file }   (se verifica en el bucket que el archivo exista)
 *
 *     DELETE /api/files?id=<uuid>        -> { ok, storageDeleted }
 */

async function countFiles(postId) {
  const [{ count }] = await sql`SELECT count(*)::int AS count FROM post_files WHERE post_id = ${postId}`
  return count
}

function assertBelowLimit(count) {
  if (count >= MAX_FILES_PER_POST) {
    throw new HttpError(409, `Máximo ${MAX_FILES_PER_POST} archivos por publicación.`, 'FILE_LIMIT_REACHED')
  }
}

// ---------- 1) URL de subida ------------------------------------------------

async function presign(req, res, user) {
  const { postId, fileName, mimeType, size } = presignSchema.parse(readBody(req))
  const post = await getOwnedPost(user, postId)
  assertBelowLimit(await countFiles(post.id))

  const key = buildPostFileKey({ portfolioId: post.portfolio_id, postId: post.id, fileName })
  const uploadUrl = await createUploadUrl({ key, contentType: mimeType, size })
  return sendJson(res, 200, { uploadUrl, key, expiresIn: UPLOAD_URL_TTL })
}

// ---------- 3) Registrar el archivo subido -----------------------------------

async function register(req, res, user) {
  const { postId, key, fileName, mimeType } = registerSchema.parse(readBody(req))
  const post = await getOwnedPost(user, postId)

  // La clave debe pertenecer a ESTA publicación (evita registrar archivos ajenos).
  const prefix = `portfolios/${post.portfolio_id}/posts/${post.id}/`
  if (!key.startsWith(prefix) || key.includes('..')) {
    throw new HttpError(400, 'El archivo no corresponde a esta publicación', 'INVALID_KEY')
  }

  // Antes de tocar el bucket: si ya está registrado no se vuelve a procesar
  // (y nunca se borra un objeto que ya usa otra fila).
  const [existing] = await sql`SELECT 1 FROM post_files WHERE storage_key = ${key}`
  if (existing) throw new HttpError(409, 'Este archivo ya fue registrado', 'ALREADY_REGISTERED')

  // Se confía en el bucket, no en el cliente: tamaño y tipo reales.
  const object = await headStorageObject(key)
  if (!object) {
    throw new HttpError(409, 'El archivo no terminó de subirse. Inténtalo de nuevo.', 'UPLOAD_NOT_FOUND')
  }
  const rules = ALLOWED_TYPES[mimeType]
  if (object.contentType !== mimeType || object.size > rules.maxSize || object.size <= 0) {
    await deleteStorageObjects([key])
    throw new HttpError(400, 'El archivo subido no coincide con el tipo o tamaño permitido', 'INVALID_UPLOAD')
  }

  if ((await countFiles(post.id)) >= MAX_FILES_PER_POST) {
    await deleteStorageObjects([key])
    assertBelowLimit(MAX_FILES_PER_POST)
  }

  let row
  try {
    ;[row] = await sql`
      INSERT INTO post_files (post_id, kind, original_name, mime_type, size_bytes, storage_key, url, position)
      VALUES (
        ${post.id}, ${rules.kind}, ${fileName}, ${mimeType}, ${object.size}, ${key}, ${key},
        (SELECT COALESCE(max(position), 0) + 1 FROM post_files WHERE post_id = ${post.id})
      )
      RETURNING *
    `
  } catch (error) {
    if (error.code === '23505') {
      throw new HttpError(409, 'Este archivo ya fue registrado', 'ALREADY_REGISTERED')
    }
    throw error
  }

  const [url, downloadUrl] = await Promise.all([
    createDownloadUrl(key, { fileName, contentType: mimeType }),
    createDownloadUrl(key, { fileName, contentType: mimeType, download: true }),
  ])
  return sendJson(res, 201, {
    file: {
      id: row.id,
      kind: row.kind,
      name: row.original_name,
      mimeType: row.mime_type,
      size: Number(row.size_bytes),
      url,
      downloadUrl,
    },
  })
}

// ---------- Eliminar ---------------------------------------------------------

async function remove(req, res, user) {
  const file = await getOwnedFile(user, idSchema.parse(req.query.id))

  await sql`DELETE FROM post_files WHERE id = ${file.id}`
  const failed = await deleteStorageObjects([file.storage_key])
  if (failed.length > 0) console.error('[files] Archivo huérfano en el bucket:', file.storage_key)

  return sendJson(res, 200, { ok: true, storageDeleted: failed.length === 0 })
}

// ---------- Enrutado -----------------------------------------------------

// ---------- Portadas ------------------------------------------------------------
/*
 *  POST   /api/files?action=cover-presign { target: 'portfolio'|'section', id, fileName, mimeType, size }
 *  POST   /api/files?action=cover         { target, id, key }   -> { coverUrl }  (reemplaza la anterior)
 *  DELETE /api/files?action=cover&target=…&id=…                 -> { ok }
 */

/** Portafolio o apartado del usuario + portafolio al que pertenece. */
async function ownedCoverTarget(user, target, id) {
  if (target === 'portfolio') {
    const portfolio = await getOwnedPortfolio(user, id)
    return { portfolioId: portfolio.id, currentKey: portfolio.cover_key }
  }
  const section = await getOwnedSection(user, id)
  return { portfolioId: section.portfolio_id, currentKey: section.cover_key }
}

async function coverPresign(req, res, user) {
  const { target, id, fileName, mimeType, size } = coverPresignSchema.parse(readBody(req))
  const { portfolioId } = await ownedCoverTarget(user, target, id)
  const key = buildCoverKey({ portfolioId, fileName })
  const uploadUrl = await createUploadUrl({ key, contentType: mimeType, size })
  return sendJson(res, 200, { uploadUrl, key, expiresIn: UPLOAD_URL_TTL })
}

async function coverSet(req, res, user) {
  const { target, id, key } = coverSetSchema.parse(readBody(req))
  const { portfolioId, currentKey } = await ownedCoverTarget(user, target, id)

  if (!key.startsWith(coverKeyPrefix(portfolioId)) || key.includes('..')) {
    throw new HttpError(400, 'La imagen no corresponde a este portafolio', 'INVALID_KEY')
  }
  // Cada imagen subida solo puede ser portada de un sitio (si no, borrar una rompería la otra).
  const [inUse] = await sql`
    SELECT 1 FROM portfolios WHERE cover_key = ${key}
    UNION ALL SELECT 1 FROM sections WHERE cover_key = ${key}
    LIMIT 1
  `
  if (inUse) throw new HttpError(409, 'Esa imagen ya se está usando como portada', 'ALREADY_SET')

  const object = await headStorageObject(key)
  if (!object) throw new HttpError(409, 'La imagen no terminó de subirse. Inténtalo de nuevo.', 'UPLOAD_NOT_FOUND')
  const rules = ALLOWED_TYPES[object.contentType]
  if (rules?.kind !== 'image' || object.size > rules.maxSize) {
    await deleteStorageObjects([key])
    throw new HttpError(400, 'El archivo subido no es una imagen válida', 'INVALID_UPLOAD')
  }

  if (target === 'portfolio') await sql`UPDATE portfolios SET cover_key = ${key} WHERE id = ${id}`
  else await sql`UPDATE sections SET cover_key = ${key} WHERE id = ${id}`

  // La imagen anterior ya no se usa: se borra del bucket.
  if (currentKey) await deleteStorageObjects([currentKey])
  return sendJson(res, 200, { coverUrl: await createDownloadUrl(key) })
}

async function coverRemove(req, res, user) {
  const { target, id } = coverRemoveSchema.parse(req.query)
  const { currentKey } = await ownedCoverTarget(user, target, id)
  if (target === 'portfolio') await sql`UPDATE portfolios SET cover_key = NULL WHERE id = ${id}`
  else await sql`UPDATE sections SET cover_key = NULL WHERE id = ${id}`
  if (currentKey) await deleteStorageObjects([currentKey])
  return sendJson(res, 200, { ok: true })
}

function withUser(fn) {
  return async (req, res) => fn(req, res, await requireUser(req))
}

export default createHandler({
  POST: withUser((req, res, user) => {
    if (req.query.action === 'presign') return presign(req, res, user)
    if (req.query.action === 'cover-presign') return coverPresign(req, res, user)
    if (req.query.action === 'cover') return coverSet(req, res, user)
    if (req.query.action) throw new HttpError(404, 'Acción no encontrada', 'NOT_FOUND')
    return register(req, res, user)
  }),
  DELETE: withUser((req, res, user) => {
    if (req.query.action === 'cover') return coverRemove(req, res, user)
    if (req.query.action) throw new HttpError(404, 'Acción no encontrada', 'NOT_FOUND')
    return remove(req, res, user)
  }),
})
