import { CopyButton } from '../ui/CopyButton.jsx'
import { Modal } from '../ui/Modal.jsx'

/**
 * Muestra las credenciales recién creadas UNA sola vez (la contraseña no se
 * guarda en texto plano en ningún sitio, así que no se puede volver a ver).
 */
export function CredentialsModal({ title, email, password, onClose }) {
  const loginUrl = `${window.location.origin}/login`
  const message = `Acceso a Portafolio Académico\nEnlace: ${loginUrl}\nCorreo: ${email}\nContraseña: ${password}`

  return (
    <Modal title={title} onClose={onClose} size="sm">
      <div className="modal__form">
        <p className="alert alert--success">
          Entrega estos datos al usuario. <strong>La contraseña no se volverá a mostrar.</strong>
        </p>

        <dl className="credentials">
          <dt>Enlace</dt>
          <dd>{loginUrl}</dd>
          <dt>Correo</dt>
          <dd>{email}</dd>
          <dt>Contraseña</dt>
          <dd>
            <code>{password}</code>
          </dd>
        </dl>

        <div className="modal__actions">
          <CopyButton text={message} label="Copiar todo" className="btn btn--ghost" />
          <button type="button" className="btn btn--primary" onClick={onClose} autoFocus>
            Listo
          </button>
        </div>
      </div>
    </Modal>
  )
}
