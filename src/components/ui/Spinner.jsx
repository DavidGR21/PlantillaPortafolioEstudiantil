import './Spinner.css'

export function Spinner({ size = 'md', label = 'Cargando…' }) {
  return (
    <span className={`spinner spinner--${size}`} role="status">
      <span className="visually-hidden">{label}</span>
    </span>
  )
}

export function FullPageLoader({ label }) {
  return (
    <div className="full-page-loader">
      <Spinner size="lg" label={label} />
    </div>
  )
}
