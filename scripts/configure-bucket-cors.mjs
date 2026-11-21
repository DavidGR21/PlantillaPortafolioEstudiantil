#!/usr/bin/env node
/**
 * Restringe el CORS del bucket a los dominios de la aplicación.
 *
 * Uso (desde la raíz del proyecto, con el .env configurado):
 *   node scripts/configure-bucket-cors.mjs https://mi-app.vercel.app            -> solo muestra el cambio
 *   node scripts/configure-bucket-cors.mjs https://mi-app.vercel.app --aplicar  -> lo aplica
 *
 * Opciones:
 *   --sin-localhost   no incluir http://localhost:5173 (desarrollo)
 *
 * Solo el navegador necesita CORS para SUBIR (PUT con URL firmada). Ver imágenes
 * y PDF (<img>, <iframe>) no depende de CORS.
 */
import { GetBucketCorsCommand, PutBucketCorsCommand, S3Client } from '@aws-sdk/client-s3'

process.loadEnvFile('.env')

const args = process.argv.slice(2)
const apply = args.includes('--aplicar')
const withLocalhost = !args.includes('--sin-localhost')
const origins = args.filter((a) => !a.startsWith('--'))

for (const origin of origins) {
  let url
  try {
    url = new URL(origin)
  } catch {
    url = null
  }
  if (!url || url.origin !== origin || url.protocol !== 'https:') {
    console.error(`✘ Origen no válido: "${origin}". Usa la forma https://dominio (sin / final ni rutas).`)
    process.exit(1)
  }
}
if (origins.length === 0) {
  console.error('✘ Indica al menos un dominio, por ejemplo: https://mi-app.vercel.app')
  process.exit(1)
}

const allowedOrigins = [...origins, ...(withLocalhost ? ['http://localhost:5173'] : [])]
const Bucket = process.env.AWS_S3_BUCKET
const client = new S3Client({
  region: process.env.AWS_REGION || 'auto',
  endpoint: process.env.AWS_ENDPOINT_URL_S3,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
})

const newRules = [
  {
    AllowedOrigins: allowedOrigins,
    AllowedMethods: ['GET', 'PUT', 'HEAD'],
    AllowedHeaders: ['content-type'],
    ExposeHeaders: ['ETag'],
    MaxAgeSeconds: 3600,
  },
]

const current = await client
  .send(new GetBucketCorsCommand({ Bucket }))
  .then((r) => r.CORSRules)
  .catch(() => null)

console.log(`Bucket: ${Bucket}\n`)
console.log('CORS actual:\n' + JSON.stringify(current, null, 2) + '\n')
console.log('CORS nuevo:\n' + JSON.stringify(newRules, null, 2) + '\n')

if (!apply) {
  console.log('Modo de prueba: no se cambió nada. Añade --aplicar para guardar el CORS nuevo.')
  process.exit(0)
}

await client.send(new PutBucketCorsCommand({ Bucket, CORSConfiguration: { CORSRules: newRules } }))
const saved = await client.send(new GetBucketCorsCommand({ Bucket }))
console.log('✔ CORS aplicado. Guardado en el bucket:\n' + JSON.stringify(saved.CORSRules, null, 2))
