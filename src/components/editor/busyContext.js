import { createContext, useContext } from 'react'

/**
 * Bloqueo del editor mientras se guarda algo delicado (p. ej. un nuevo orden).
 * runBlocking(mensaje, fnAsync): muestra la pantalla de carga, bloquea la
 * edición, ejecuta fnAsync y la quita al terminar (relanza los errores).
 */
export const EditorBusyContext = createContext({
  busyMessage: null,
  runBlocking: async (_message, fn) => fn(),
})

export function useEditorBusy() {
  return useContext(EditorBusyContext)
}
