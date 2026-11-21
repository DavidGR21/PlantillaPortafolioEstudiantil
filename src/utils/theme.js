const HEX_COLOR = /^#(?:[0-9a-f]{3}){1,2}$/i

export const DEFAULT_PRIMARY = '#2563eb'

/** Colores sugeridos para el portafolio (todos con buen contraste con texto blanco). */
export const THEME_PRESETS = [
  { name: 'Azul', value: '#2563eb' },
  { name: 'Índigo', value: '#4f46e5' },
  { name: 'Violeta', value: '#7c3aed' },
  { name: 'Rosa', value: '#be185d' },
  { name: 'Rojo', value: '#dc2626' },
  { name: 'Naranja', value: '#c2410c' },
  { name: 'Verde', value: '#15803d' },
  { name: 'Turquesa', value: '#0f766e' },
  { name: 'Grafito', value: '#475569' },
]

export function isHexColor(value) {
  return typeof value === 'string' && HEX_COLOR.test(value)
}

function toRgb(hex) {
  let h = hex.slice(1)
  if (h.length === 3) h = [...h].map((c) => c + c).join('')
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16))
}

/** Contraste (WCAG) entre el color y el texto blanco: 4.5 o más es legible. */
export function contrastWithWhite(hex) {
  const [r, g, b] = toRgb(hex).map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return 1.05 / (luminance + 0.05)
}

/**
 * Convierte el `theme` guardado del portafolio en variables CSS.
 * Solo se aceptan colores hexadecimales (evita inyectar CSS arbitrario).
 */
export function themeToStyle(theme) {
  const style = {}
  if (theme && isHexColor(theme.primary)) {
    style['--color-primary'] = theme.primary
    style['--color-primary-hover'] = `color-mix(in srgb, ${theme.primary} 82%, black)`
    style['--color-primary-soft'] = `color-mix(in srgb, ${theme.primary} 14%, white)`
  }
  return style
}
