import {
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

/*
 * Bucket S3-compatible PRIVADO (Neon Storage). Variables:
 *   AWS_ENDPOINT_URL_S3, AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET
 *
 * - Subida: el navegador sube directo al bucket con una URL prefirmada (PUT),
 *   así el archivo no pasa por la función de Vercel (límite ~4.5 MB).
 * - Lectura: como el bucket es privado, cada archivo se muestra con una URL
 *   firmada temporal (GET).
 */

export const UPLOAD_URL_TTL = 10 * 60 // 10 min para iniciar la subida
export const DOWNLOAD_URL_TTL = 2 * 60 * 60 // 2 h para ver/descargar

let client

function getClient() {
  if (!client) {
    client = new S3Client({
      region: process.env.AWS_REGION || 'auto',
      endpoint: process.env.AWS_ENDPOINT_URL_S3 || undefined,
      // Neon (y la mayoría de S3-compatibles) requieren rutas tipo endpoint/bucket/clave:
      // con el estilo "bucket.endpoint" el certificado TLS no coincide.
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    })
  }
  return client
}

function getBucket() {
  const bucket = process.env.AWS_S3_BUCKET
  if (!bucket) throw new Error('Falta la variable de entorno AWS_S3_BUCKET')
  return bucket
}

// ---------- Claves ---------------------------------------------------------

/** "Mi Ensayo Final (v2).PDF" -> "mi-ensayo-final-v2.pdf" (seguro para la clave). */
export function safeFileName(name) {
  const dot = name.lastIndexOf('.')
  const base = dot > 0 ? name.slice(0, dot) : name
  const ext = dot > 0 ? name.slice(dot + 1) : ''
  const clean = (text) =>
    text
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  const safeBase = clean(base).slice(0, 80) || 'archivo'
  const safeExt = clean(ext).slice(0, 10)
  return safeExt ? `${safeBase}.${safeExt}` : safeBase
}

/** portfolios/<portfolioId>/posts/<postId>/<uuid>-<nombre> */
export function buildPostFileKey({ portfolioId, postId, fileName }) {
  return `portfolios/${portfolioId}/posts/${postId}/${crypto.randomUUID()}-${safeFileName(fileName)}`
}

// ---------- URLs firmadas ----------------------------------------------------

/**
 * URL para que el navegador suba el archivo con PUT.
 * Se firman el tipo y el tamaño: si el navegador envía otro Content-Type u otro
 * tamaño, el bucket rechaza la subida.
 */
export function createUploadUrl({ key, contentType, size }) {
  return getSignedUrl(
    getClient(),
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      ContentType: contentType,
      ContentLength: size,
    }),
    { expiresIn: UPLOAD_URL_TTL, signableHeaders: new Set(['content-type', 'content-length']) },
  )
}

/**
 * URL temporal para ver (inline) o descargar (attachment) un archivo privado.
 * La firma es un cálculo local: no hace ninguna petición al bucket.
 */
export function createDownloadUrl(key, { fileName, contentType, download = false, expiresIn = DOWNLOAD_URL_TTL } = {}) {
  const disposition = fileName
    ? `${download ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(fileName)}`
    : undefined
  return getSignedUrl(
    getClient(),
    new GetObjectCommand({
      Bucket: getBucket(),
      Key: key,
      ResponseContentDisposition: disposition,
      ResponseContentType: contentType,
    }),
    { expiresIn },
  )
}

// ---------- Consultas y borrado ---------------------------------------------

/** Metadatos del objeto ({ size, contentType }) o null si no existe. */
export async function headStorageObject(key) {
  try {
    const result = await getClient().send(new HeadObjectCommand({ Bucket: getBucket(), Key: key }))
    return { size: result.ContentLength, contentType: result.ContentType }
  } catch (error) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) return null
    throw error
  }
}

/** true si el bucket responde con las credenciales configuradas. */
export async function checkStorage() {
  await getClient().send(new HeadBucketCommand({ Bucket: getBucket() }))
  return true
}

/**
 * Borra objetos del bucket (en lotes de 1000, el máximo de S3).
 * Devuelve las claves que NO se pudieron borrar.
 */
export async function deleteStorageObjects(keys) {
  const unique = [...new Set(keys.filter(Boolean))]
  if (unique.length === 0) return []

  const failed = []
  for (let i = 0; i < unique.length; i += 1000) {
    const batch = unique.slice(i, i + 1000)
    try {
      const result = await getClient().send(
        new DeleteObjectsCommand({
          Bucket: getBucket(),
          Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true },
        }),
      )
      for (const error of result.Errors ?? []) failed.push(error.Key)
    } catch (error) {
      console.error('[storage] Error al borrar objetos:', error)
      failed.push(...batch)
    }
  }
  return failed
}
