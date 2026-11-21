import { useId } from 'react'
import './Logo.css'

/**
 * Isotipo de Portafolio Académico: birrete sobre una hoja con renglones
 * (el portafolio), con la borla en rosa como detalle.
 * Colores de marca: azul #0E7490, blanco #ECFEFF, rosa #FB7185.
 */
export function LogoMark({ size = 40, className = '', title }) {
  const titleId = useId()
  return (
    <svg
      className={`logo-mark ${className}`}
      width={size}
      height={size}
      viewBox="0 0 40 40"
      role={title ? 'img' : undefined}
      aria-labelledby={title ? titleId : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title && <title id={titleId}>{title}</title>}
      <rect width="40" height="40" rx="11" fill="#0E7490" />
      {/* Hoja del portafolio */}
      <path d="M11 20.5h18v9.5a3 3 0 0 1-3 3H14a3 3 0 0 1-3-3z" fill="#ECFEFF" opacity="0.22" />
      <path d="M14.5 26.5h11M14.5 30h7" stroke="#ECFEFF" strokeWidth="1.8" strokeLinecap="round" opacity="0.75" />
      {/* Birrete */}
      <path d="M20 8.5 33 14.5 20 20.5 7 14.5Z" fill="#ECFEFF" />
      <path d="M12.5 17.2v4.3c0 1.6 3.4 3 7.5 3s7.5-1.4 7.5-3v-4.3L20 20.6Z" fill="#ECFEFF" opacity="0.88" />
      {/* Borla (detalle rosa) */}
      <path d="M33 14.5v7.2" stroke="#FB7185" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="33" cy="23.4" r="2.2" fill="#FB7185" />
    </svg>
  )
}

/** Logotipo completo: isotipo + nombre. variant="light" para fondos oscuros. */
export function Logo({ size = 40, variant = 'dark', className = '' }) {
  return (
    <span className={`logo logo--${variant} ${className}`}>
      <LogoMark size={size} />
      <span className="logo__text">
        <span className="logo__name">Portafolio</span>
        <span className="logo__tagline">Académico</span>
      </span>
    </span>
  )
}
