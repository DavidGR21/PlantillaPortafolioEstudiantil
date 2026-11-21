/** Error devuelto por la API, con el código HTTP y el código de negocio. */
export class ApiError extends Error {
  constructor(status, message, code, fields) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fields = fields
  }
}

/**
 * Llama a la API del mismo dominio (/api/...). La cookie de sesión viaja
 * automáticamente. Devuelve el JSON de la respuesta o lanza ApiError.
 */
export async function apiRequest(path, { method = 'GET', body, signal } = {}) {
  const options = { method, credentials: 'same-origin', signal, headers: {} }

  if (body !== undefined) {
    options.headers['Content-Type'] = 'application/json'
    options.body = JSON.stringify(body)
  }

  let response
  try {
    response = await fetch(`/api/${path}`, options)
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new ApiError(0, 'No se pudo conectar con el servidor. Revisa tu conexión.', 'NETWORK_ERROR')
  }

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new ApiError(
      response.status,
      data?.error || `Error inesperado (${response.status})`,
      data?.code,
      data?.fields,
    )
  }
  return data
}
