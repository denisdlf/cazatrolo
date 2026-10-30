export const ZONA = 'America/Santiago'

// Diferencia entre el reloj del servidor y el del teléfono (se fija al cargar el perfil)
let desfase = 0
export function sincronizarReloj(ahoraServidor: string) {
  desfase = new Date(ahoraServidor).getTime() - Date.now()
}
export const ahora = () => new Date(Date.now() + desfase)

export function fechaHora(iso: string): string {
  return new Date(iso).toLocaleString('es-CL', {
    timeZone: ZONA, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

export function nombreMes(periodo: string): string {
  const [a, m] = periodo.split('-').map(Number)
  const s = new Date(Date.UTC(a, m - 1, 15)).toLocaleString('es-CL', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Días que quedan del mes en curso (hora de Chile), contando hoy. */
export function diasRestantes(periodo: string, hoy = ahora()): number {
  const [a, m] = periodo.split('-').map(Number)
  const ultimo = new Date(Date.UTC(a, m, 0)).getUTCDate()
  const diaHoy = Number(hoy.toLocaleString('en-US', { timeZone: ZONA, day: 'numeric' }))
  return ultimo - diaHoy + 1
}

export function duracion(segundos: number): string {
  const s = Math.max(0, Math.ceil(segundos))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h > 0) return `${h} h ${m} min`
  if (m > 0) return `${m} min`
  return `${s} s`
}

export const segundosHasta = (iso: string) => (new Date(iso).getTime() - ahora().getTime()) / 1000
