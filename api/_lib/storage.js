import { DeleteObjectsCommand, S3Client } from '@aws-sdk/client-s3'

/*
 * Acceso al bucket S3-compatible. Variables:
 *   AWS_ENDPOINT_URL_S3, AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET
 * (Las URLs prefirmadas de subida se agregan en el paso 12.)
 */

let client

function getClient() {
  if (!client) {
    client = new S3Client({
      region: process.env.AWS_REGION || 'auto',
      endpoint: process.env.AWS_ENDPOINT_URL_S3 || undefined,
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
