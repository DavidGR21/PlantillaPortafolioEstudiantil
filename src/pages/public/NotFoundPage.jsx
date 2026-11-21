import { StatusMessage } from '../../components/ui/StatusMessage.jsx'

export default function NotFoundPage() {
  return (
    <StatusMessage
      code="404"
      title="Página no encontrada"
      message="La dirección que buscas no existe o fue movida."
    />
  )
}
