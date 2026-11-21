/**
 * Variable CSS con la imagen de portada (si la hay). La URL viene firmada de
 * la API y apunta al bucket, permitido por la CSP (img-src).
 */
export function heroImageStyle(url) {
  return url ? { '--hero-image': `url("${url}")` } : undefined
}
