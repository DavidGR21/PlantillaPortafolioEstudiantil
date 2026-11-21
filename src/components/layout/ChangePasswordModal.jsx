import { useState } from 'react'
import { Modal } from '../ui/Modal.jsx'
import { Spinner } from '../ui/Spinner.jsx'
import { changePassword } from '../../services/authService.js'

/** Cambiar la contraseña propia (cualquier usuario con sesión). */
export function ChangePasswordModal({ onClose }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [visible, setVisible] = useState(false)
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [done, setDone] = useState(false)

  const mismatch = confirm.length > 0 && next !== confirm
  const tooShort = next.length > 0 && next.length < 8
  const canSubmit = current && next.length >= 8 && next === confirm && !isSaving

  async function handleSubmit(event) {
    event.preventDefault()
    if (!canSubmit) return
    setError('')
    setIsSaving(true)
    try {
      await changePassword(current, next)
      setDone(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  if (done) {
    return (
      <Modal title="Contraseña actualizada" onClose={onClose} size="sm">
        <div className="modal__form">
          <p className="alert alert--success">
            Tu contraseña se cambió. Por seguridad, se cerró la sesión en los demás equipos donde la tenías abierta.
          </p>
          <div className="modal__actions">
            <button type="button" className="btn btn--primary" onClick={onClose} autoFocus>
              Listo
            </button>
          </div>
        </div>
      </Modal>
    )
  }

  const type = visible ? 'text' : 'password'

  return (
    <Modal title="Cambiar mi contraseña" onClose={onClose} dismissible={!isSaving} size="sm">
      <form className="modal__form" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="pw-current">Contraseña actual</label>
          <input
            id="pw-current"
            type={type}
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            autoComplete="current-password"
            required
            autoFocus
          />
        </div>

        <div className="field">
          <label htmlFor="pw-new">Nueva contraseña</label>
          <input
            id="pw-new"
            type={type}
            value={next}
            onChange={(e) => setNext(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            maxLength={200}
            aria-describedby="pw-new-hint"
            required
          />
          <p id="pw-new-hint" className={`field__hint${tooShort ? ' field__hint--invalid' : ''}`}>
            Mínimo 8 caracteres.
          </p>
        </div>

        <div className="field">
          <label htmlFor="pw-confirm">Repite la nueva contraseña</label>
          <input
            id="pw-confirm"
            type={type}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            required
          />
          {mismatch && <p className="field__hint field__hint--invalid">Las contraseñas no coinciden.</p>}
        </div>

        <label className="checkbox">
          <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} />
          Mostrar contraseñas
        </label>

        {error && (
          <p className="alert alert--error" role="alert">
            {error}
          </p>
        )}

        <div className="modal__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={isSaving}>
            Cancelar
          </button>
          <button type="submit" className="btn btn--primary" disabled={!canSubmit}>
            {isSaving ? <Spinner size="sm" label="Guardando…" /> : 'Cambiar contraseña'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
