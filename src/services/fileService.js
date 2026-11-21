import { apiRequest, ApiError } from './apiClient.js'
import { detectMimeType } from '../utils/files.js'

/**
 * Sube un archivo a una publicación:
 *   1) pide una URL firmada a la API,
 *   2) sube el archivo DIRECTO al bucket (con progreso),
 *   3) registra el archivo en la API.
 * onProgress(0..1) se llama durante la subida. signal permite cancelar.
 * Devuelve el archivo registrado.
 */
export async function uploadPostFile(postId, file, { onProgress, signal } = {}) {
  const mimeType = detectMimeType(file)

  const { uploadUrl, key } = await apiRequest('files?action=presign', {
    method: 'POST',
    body: { postId, fileName: file.name, mimeType, size: file.size },
    signal,
  })

  await putWithProgress(uploadUrl, file, mimeType, onProgress, signal)

  const { file: saved } = await apiRequest('files', {
    method: 'POST',
    body: { postId, key, fileName: file.name, mimeType },
    signal,
  })
  return saved
}

export function deleteFile(id) {
  return apiRequest(`files?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
}

/** PUT con XMLHttpRequest (fetch no informa el progreso de subida). */
function putWithProgress(url, file, contentType, onProgress, signal) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    xhr.setRequestHeader('Content-Type', contentType)

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total)
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(1)
        resolve()
      } else {
        reject(new ApiError(xhr.status, 'El almacenamiento rechazó el archivo. Inténtalo de nuevo.', 'UPLOAD_FAILED'))
      }
    }
    xhr.onerror = () =>
      reject(new ApiError(0, 'Se perdió la conexión durante la subida.', 'NETWORK_ERROR'))
    xhr.onabort = () => reject(new DOMException('Subida cancelada', 'AbortError'))

    if (signal) {
      if (signal.aborted) return xhr.onabort()
      signal.addEventListener('abort', () => xhr.abort(), { once: true })
    }
    xhr.send(file)
  })
}

/**
 * Sube una imagen de portada (target: 'portfolio' | 'section') y la asigna.
 * Reemplaza la anterior (la API la borra del bucket). Devuelve { coverUrl }.
 */
export async function uploadCover(target, id, file, { onProgress, signal } = {}) {
  const mimeType = detectMimeType(file)
  const { uploadUrl, key } = await apiRequest('files?action=cover-presign', {
    method: 'POST',
    body: { target, id, fileName: file.name, mimeType, size: file.size },
    signal,
  })
  await putWithProgress(uploadUrl, file, mimeType, onProgress, signal)
  return apiRequest('files?action=cover', { method: 'POST', body: { target, id, key }, signal })
}

export function removeCover(target, id) {
  const params = new URLSearchParams({ action: 'cover', target, id })
  return apiRequest(`files?${params}`, { method: 'DELETE' })
}
