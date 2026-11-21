import { useEffect, useState } from 'react'

/** Botón que copia `text` al portapapeles y confirma con «¡Copiado!». */
export function CopyButton({ text, label = 'Copiar', className = 'btn btn--ghost btn--sm' }) {
  const [state, setState] = useState('idle') // idle | copied | failed

  useEffect(() => {
    if (state === 'idle') return
    const timer = setTimeout(() => setState('idle'), 2000)
    return () => clearTimeout(timer)
  }, [state])

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setState('copied')
    } catch {
      setState('failed')
    }
  }

  return (
    <button type="button" className={className} onClick={copy}>
      {state === 'copied' ? '¡Copiado!' : state === 'failed' ? 'Cópialo a mano' : label}
    </button>
  )
}
