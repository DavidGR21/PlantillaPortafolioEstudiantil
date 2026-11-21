const HEX_COLOR = /^#(?:[0-9a-f]{3}){1,2}$/i

/**
 * Convierte el `theme` guardado del portafolio en variables CSS.
 * Solo se aceptan colores hexadecimales (evita inyectar CSS arbitrario).
 */
export function themeToStyle(theme) {
  const style = {}
  if (theme && HEX_COLOR.test(theme.primary ?? '')) {
    style['--color-primary'] = theme.primary
    style['--color-primary-hover'] = theme.primary
    style['--color-primary-soft'] = `color-mix(in srgb, ${theme.primary} 15%, white)`
  }
  return style
}
