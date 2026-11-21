import { useCallback, useMemo, useRef, useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import { EditorBusyContext } from './busyContext.js'

/**
 * Proveedor del bloqueo del editor. El contenido recibe `inert` mientras hay
 * una operación en curso: no se puede hacer clic ni usar el teclado en él.
 */
export function EditorBusyProvider({ children }) {
  const [busyMessage, setBusyMessage] = useState(null)
  const runningRef = useRef(false)

  const runBlocking = useCallback(async (message, fn) => {
    if (runningRef.current) return undefined // ya hay una operación bloqueante en curso
    runningRef.current = true
    setBusyMessage(message)
    try {
      return await fn()
    } finally {
      runningRef.current = false
      setBusyMessage(null)
    }
  }, [])

  const value = useMemo(() => ({ busyMessage, runBlocking }), [busyMessage, runBlocking])

  return (
    <EditorBusyContext.Provider value={value}>
      <div className="editor-busy-scope" inert={busyMessage ? true : undefined} aria-busy={busyMessage ? 'true' : undefined}>
        {children}
      </div>
      {busyMessage && (
        <div className="busy-overlay" role="status" aria-live="assertive">
          <div className="busy-overlay__card">
            <LoaderCircle className="busy-overlay__spinner" size={22} aria-hidden="true" />
            <span>{busyMessage}</span>
          </div>
        </div>
      )}
    </EditorBusyContext.Provider>
  )
}
