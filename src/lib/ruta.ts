import { useEffect, useState } from 'react'

/** Enrutador mínimo basado en el hash (#/ranking, #/caza/123…). */
export function useRuta(): string[] {
  const leer = () => window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean)
  const [ruta, setRuta] = useState(leer)
  useEffect(() => {
    const f = () => setRuta(leer())
    window.addEventListener('hashchange', f)
    return () => window.removeEventListener('hashchange', f)
  }, [])
  return ruta
}

export const ir = (path: string) => {
  window.location.hash = path.startsWith('/') ? path : `/${path}`
}
