import { useState } from 'react'
import { Modal } from '../ui/Modal.jsx'
import { PasswordField } from '../ui/PasswordField.jsx'
import { Spinner } from '../ui/Spinner.jsx'

/**
 * Crear (user = null) o editar un usuario.
 * - Al crear se pide correo y contraseña inicial.
 * - Al editar, el correo no cambia y la contraseña se restablece aparte.
 * onSubmit(data) es async; si lanza, se muestra el error.
 */
export function UserFormModal({ user, isSelf, onSubmit, onClose }) {
  const isEdit = Boolean(user)
  const [fullName, setFullName] = useState(user?.fullName ?? '')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState(user?.role ?? 'student')
  const [maxPortfolios, setMaxPortfolios] = useState(String(user?.maxPortfolios ?? 3))
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const max = Number(maxPortfolios)
  const maxValid = maxPortfolios !== '' && Number.isInteger(max) && max >= 0 && max <= 20
  const canSubmit =
    fullName.trim().length >= 2 && maxValid && (isEdit || (email.trim() && password.length >= 8)) && !isSaving

  async function handleSubmit(event) {
    event.preventDefault()
    if (!canSubmit) return
    setError('')
    setIsSaving(true)
    try {
      const data = { fullName: fullName.trim(), role, maxPortfolios: max }
      if (!isEdit) Object.assign(data, { email: email.trim(), password })
      await onSubmit(data)
    } catch (err) {
      setError(err.message)
      setIsSaving(false)
    }
  }

  return (
    <Modal title={isEdit ? `Editar a ${user.fullName}` : 'Nuevo usuario'} onClose={onClose} dismissible={!isSaving}>
      <form className="modal__form" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="user-name">Nombre completo *</label>
          <input
            id="user-name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            maxLength={150}
            autoComplete="off"
            required
            autoFocus
          />
        </div>

        {isEdit ? (
          <p className="field__hint">
            Correo: <strong>{user.email}</strong> (no se puede cambiar)
          </p>
        ) : (
          <>
            <div className="field">
              <label htmlFor="user-email">Correo electrónico *</label>
              <input
                id="user-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="off"
                required
              />
            </div>
            <PasswordField
              id="user-password"
              label="Contraseña inicial *"
              value={password}
              onChange={setPassword}
              hint="Mínimo 8 caracteres. Se mostrará una sola vez para que se la entregues al usuario."
            />
          </>
        )}

        <div className="form-row">
          <div className="field">
            <label htmlFor="user-role">Rol</label>
            <select
              id="user-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={isSelf}
              title={isSelf ? 'No puedes cambiar tu propio rol' : undefined}
            >
              <option value="student">Estudiante</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="user-max">Máx. portafolios</label>
            <input
              id="user-max"
              type="number"
              min={0}
              max={20}
              step={1}
              value={maxPortfolios}
              onChange={(e) => setMaxPortfolios(e.target.value)}
              required
            />
          </div>
        </div>

        {!maxValid && <p className="field__hint field__hint--invalid">El límite debe ser un número entero entre 0 y 20.</p>}
        {isEdit && maxValid && max < user.portfoliosCount && (
          <p className="field__hint">
            Tiene {user.portfoliosCount} portafolios: no se borrarán, pero no podrá crear más hasta tener menos de {max}.
          </p>
        )}

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
            {isSaving ? <Spinner size="sm" label="Guardando…" /> : isEdit ? 'Guardar cambios' : 'Crear usuario'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
