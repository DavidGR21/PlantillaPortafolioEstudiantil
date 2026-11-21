import { useState } from 'react'
import { Modal } from '../ui/Modal.jsx'
import { PasswordField } from '../ui/PasswordField.jsx'
import { Spinner } from '../ui/Spinner.jsx'
import { generatePassword } from '../../utils/password.js'

/** Asigna una contraseña nueva a un usuario. onSubmit(password) es async. */
export function ResetPasswordModal({ user, onSubmit, onClose }) {
  const [password, setPassword] = useState(() => generatePassword())
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    if (password.length < 8 || isSaving) return
    setError('')
    setIsSaving(true)
    try {
      await onSubmit(password)
    } catch (err) {
      setError(err.message)
      setIsSaving(false)
    }
  }

  return (
    <Modal title="Restablecer contraseña" onClose={onClose} dismissible={!isSaving} size="sm">
      <form className="modal__form" onSubmit={handleSubmit} noValidate>
        <p className="confirm-dialog__body">
          Nueva contraseña para <strong>{user.fullName}</strong> ({user.email}). La anterior dejará de funcionar.
        </p>
        <PasswordField id="reset-password" label="Nueva contraseña" value={password} onChange={setPassword} />

        {error && (
          <p className="alert alert--error" role="alert">
            {error}
          </p>
        )}

        <div className="modal__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={isSaving}>
            Cancelar
          </button>
          <button type="submit" className="btn btn--primary" disabled={password.length < 8 || isSaving}>
            {isSaving ? <Spinner size="sm" label="Guardando…" /> : 'Cambiar contraseña'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
