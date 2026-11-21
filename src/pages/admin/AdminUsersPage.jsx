import { useState } from 'react'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx'
import { Spinner } from '../../components/ui/Spinner.jsx'
import { CredentialsModal } from '../../components/admin/CredentialsModal.jsx'
import { ResetPasswordModal } from '../../components/admin/ResetPasswordModal.jsx'
import { UserFormModal } from '../../components/admin/UserFormModal.jsx'
import { useAdminUsers } from '../../hooks/useAdminUsers.js'
import { useAuth } from '../../hooks/useAuth.js'
import * as adminService from '../../services/adminService.js'
import { formatDate } from '../../utils/format.js'

/** /admin/usuarios: crear, editar, activar/desactivar y restablecer contraseñas. */
export default function AdminUsersPage() {
  const { user: me, refresh: refreshSession } = useAuth()
  const [search, setSearch] = useState('')
  const { users, isLoading, isSearching, error, reload } = useAdminUsers(search)

  // Diálogo abierto: { type: 'create' | 'edit' | 'reset' | 'toggle', user? }
  const [dialog, setDialog] = useState(null)
  const [credentials, setCredentials] = useState(null) // { title, email, password }
  const [notice, setNotice] = useState('')

  const close = () => setDialog(null)

  async function afterChange(message) {
    close()
    setNotice(message)
    await reload().catch(() => {})
  }

  async function handleCreate(data) {
    const user = await adminService.createUser(data)
    setCredentials({ title: 'Usuario creado', email: user.email, password: data.password })
    await afterChange(`Se creó la cuenta de ${user.fullName}.`)
  }

  async function handleEdit(data) {
    const original = dialog.user
    const changes = Object.fromEntries(Object.entries(data).filter(([key, value]) => original[key] !== value))
    if (Object.keys(changes).length > 0) await adminService.updateUser(original.id, changes)
    // Si me edito a mí mismo (nombre o límite), actualizo la sesión.
    if (original.id === me.id) await refreshSession()
    await afterChange(`Se guardaron los cambios de ${data.fullName}.`)
  }

  async function handleReset(password) {
    const { user } = dialog
    await adminService.resetUserPassword(user.id, password)
    setCredentials({ title: 'Contraseña restablecida', email: user.email, password })
    await afterChange(`Se cambió la contraseña de ${user.fullName}.`)
  }

  async function handleToggle() {
    const { user } = dialog
    await adminService.updateUser(user.id, { isActive: !user.isActive })
    await afterChange(`${user.fullName} quedó ${user.isActive ? 'desactivado' : 'activado'}.`)
  }

  return (
    <section className="admin-section" aria-labelledby="users-title">
      <header className="admin-section__header">
        <div>
          <h2 id="users-title" className="admin-section__title">
            Usuarios
          </h2>
          <p className="text-muted">Crea las cuentas de los estudiantes y gestiona su acceso.</p>
        </div>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => {
            setNotice('')
            setDialog({ type: 'create' })
          }}
        >
          + Nuevo usuario
        </button>
      </header>

      <div className="admin-toolbar">
        <label htmlFor="user-search" className="visually-hidden">
          Buscar usuarios
        </label>
        <input
          id="user-search"
          type="search"
          className="admin-toolbar__search"
          placeholder="Buscar por nombre o correo…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {isSearching && <Spinner size="sm" label="Buscando…" />}
      </div>

      {notice && (
        <p className="alert alert--success admin-notice" role="status">
          {notice}
          <button type="button" className="alert__close" onClick={() => setNotice('')} aria-label="Cerrar aviso">
            ×
          </button>
        </p>
      )}

      {isLoading ? (
        <div className="admin-loading">
          <Spinner label="Cargando usuarios…" />
        </div>
      ) : error ? (
        <p className="alert alert--error" role="alert">
          No se pudieron cargar los usuarios: {error.message}
        </p>
      ) : users.length === 0 ? (
        <p className="text-muted admin-empty">
          {search.trim() ? `Ningún usuario coincide con «${search.trim()}».` : 'Aún no hay usuarios.'}
        </p>
      ) : (
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">Usuario</th>
                <th scope="col">Rol</th>
                <th scope="col">Estado</th>
                <th scope="col">Portafolios</th>
                <th scope="col">Último acceso</th>
                <th scope="col">
                  <span className="visually-hidden">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const isSelf = user.id === me.id
                return (
                  <tr key={user.id} className={user.isActive ? '' : 'admin-table__row--inactive'}>
                    <td data-label="Usuario">
                      <div className="user-cell">
                        <strong>
                          {user.fullName}
                          {isSelf && <span className="text-muted"> (tú)</span>}
                        </strong>
                        <span className="text-muted">{user.email}</span>
                      </div>
                    </td>
                    <td data-label="Rol">
                      <span className={`badge ${user.role === 'admin' ? 'badge--info' : 'badge--neutral'}`}>
                        {user.role === 'admin' ? 'Administrador' : 'Estudiante'}
                      </span>
                    </td>
                    <td data-label="Estado">
                      <span className={`badge ${user.isActive ? 'badge--success' : 'badge--danger'}`}>
                        {user.isActive ? 'Activo' : 'Desactivado'}
                      </span>
                    </td>
                    <td data-label="Portafolios">
                      {user.portfoliosCount} de {user.maxPortfolios}
                    </td>
                    <td data-label="Último acceso">
                      {user.lastLoginAt ? formatDate(user.lastLoginAt) : <span className="text-muted">Nunca</span>}
                    </td>
                    <td className="admin-table__actions">
                      <button type="button" className="btn btn--ghost btn--sm" onClick={() => setDialog({ type: 'edit', user })}>
                        Editar
                      </button>
                      <button type="button" className="btn btn--ghost btn--sm" onClick={() => setDialog({ type: 'reset', user })}>
                        Contraseña
                      </button>
                      <button
                        type="button"
                        className={`btn btn--ghost btn--sm${user.isActive ? ' btn--text-danger' : ''}`}
                        onClick={() => setDialog({ type: 'toggle', user })}
                        disabled={isSelf}
                        title={isSelf ? 'No puedes desactivar tu propia cuenta' : undefined}
                      >
                        {user.isActive ? 'Desactivar' : 'Activar'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {dialog?.type === 'create' && <UserFormModal onSubmit={handleCreate} onClose={close} />}
      {dialog?.type === 'edit' && (
        <UserFormModal user={dialog.user} isSelf={dialog.user.id === me.id} onSubmit={handleEdit} onClose={close} />
      )}
      {dialog?.type === 'reset' && <ResetPasswordModal user={dialog.user} onSubmit={handleReset} onClose={close} />}
      {dialog?.type === 'toggle' && (
        <ConfirmDialog
          title={dialog.user.isActive ? 'Desactivar usuario' : 'Activar usuario'}
          confirmLabel={dialog.user.isActive ? 'Desactivar' : 'Activar'}
          busyLabel="Guardando…"
          variant={dialog.user.isActive ? 'danger' : 'primary'}
          onConfirm={handleToggle}
          onClose={close}
        >
          {dialog.user.isActive ? (
            <p>
              <strong>{dialog.user.fullName}</strong> no podrá iniciar sesión y su sesión actual se cerrará. Sus{' '}
              {dialog.user.portfoliosCount} portafolio(s) dejarán de verse públicamente hasta que lo actives de nuevo.
            </p>
          ) : (
            <p>
              <strong>{dialog.user.fullName}</strong> podrá volver a iniciar sesión y sus portafolios activos serán
              visibles otra vez.
            </p>
          )}
        </ConfirmDialog>
      )}

      {credentials && <CredentialsModal {...credentials} onClose={() => setCredentials(null)} />}
    </section>
  )
}
