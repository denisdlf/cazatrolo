import { useCallback, useEffect, useState } from 'react'
import { mensajeError } from './errores'

/** Carga datos asíncronos y los recarga al volver a la app. */
export function useDatos<T>(cargar: () => Promise<T>, deps: unknown[] = []) {
  const [datos, setDatos] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fn = useCallback(cargar, deps)
  const recargar = useCallback(async () => {
    try {
      setDatos(await fn())
      setError(null)
    } catch (e) {
      setError(mensajeError(e))
    }
  }, [fn])
  useEffect(() => {
    setDatos(null)
    recargar()
    const alVolver = () => document.visibilityState === 'visible' && recargar()
    document.addEventListener('visibilitychange', alVolver)
    return () => document.removeEventListener('visibilitychange', alVolver)
  }, [recargar])
  return { datos, error, recargar }
}
