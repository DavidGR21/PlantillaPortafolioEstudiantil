import { useState } from 'react'
import { generatePassword } from '../../utils/password.js'

/**
 * Campo de contraseña con «Mostrar» y «Generar» (para que el administrador
 * cree contraseñas seguras sin inventarlas).
 */
export function PasswordField({ id, label, value, onChange, autoComplete = 'new-password', hint }) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="password-field">
        <div className="field__with-action">
          <input
            id={id}
            type={visible ? 'text' : 'password'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            autoComplete={autoComplete}
            spellCheck={false}
            minLength={8}
            maxLength={200}
            required
          />
          <button
            type="button"
            className="field__action"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {visible ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => {
            onChange(generatePassword())
            setVisible(true)
          }}
        >
          Generar
        </button>
      </div>
      <p className="field__hint">{hint ?? 'Mínimo 8 caracteres.'}</p>
    </div>
  )
}
