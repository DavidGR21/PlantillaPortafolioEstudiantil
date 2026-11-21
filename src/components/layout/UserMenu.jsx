import { useEffect, useId, useRef, useState } from 'react'
import { ChevronDown, KeyRound, LoaderCircle, LogOut } from 'lucide-react'
import { initialsOf } from '../../utils/format.js'

/**
 * Menú del usuario: avatar + nombre; al abrirlo, cambiar contraseña y cerrar sesión.
 * Se cierra con Esc, al hacer clic fuera o al elegir una opción.
 */
export function UserMenu({ user, onChangePassword, onLogout, isLeaving }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const buttonRef = useRef(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    const onPointer = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    const onKey = (event) => {
      if (event.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const choose = (action) => () => {
    setOpen(false)
    action()
  }

  const roleLabel = user.role === 'admin' ? 'Administrador' : 'Estudiante'

  return (
    <div className="user-menu" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className={`user-menu__trigger${open ? ' user-menu__trigger--open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
      >
        <span className="user-menu__avatar" aria-hidden="true">
          {initialsOf(user.fullName)}
        </span>
        <span className="user-menu__who">
          <span className="user-menu__name">{user.fullName}</span>
          <span className="user-menu__role">{roleLabel}</span>
        </span>
        <ChevronDown className="user-menu__chevron" size={16} aria-hidden="true" />
        <span className="visually-hidden">Abrir menú de la cuenta</span>
      </button>

      {open && (
        <div id={menuId} className="user-menu__panel" role="menu" aria-label="Cuenta">
          <div className="user-menu__header">
            <span className="user-menu__avatar user-menu__avatar--lg" aria-hidden="true">
              {initialsOf(user.fullName)}
            </span>
            <div>
              <p className="user-menu__panel-name">{user.fullName}</p>
              <p className="user-menu__panel-email">{user.email}</p>
            </div>
          </div>
          <button type="button" role="menuitem" className="user-menu__item" onClick={choose(onChangePassword)}>
            <KeyRound size={17} aria-hidden="true" />
            Cambiar contraseña
          </button>
          <button
            type="button"
            role="menuitem"
            className="user-menu__item user-menu__item--danger"
            onClick={choose(onLogout)}
            disabled={isLeaving}
          >
            {isLeaving ? (
              <LoaderCircle className="spin" size={17} aria-hidden="true" />
            ) : (
              <LogOut size={17} aria-hidden="true" />
            )}
            {isLeaving ? 'Cerrando sesión…' : 'Cerrar sesión'}
          </button>
        </div>
      )}
    </div>
  )
}
