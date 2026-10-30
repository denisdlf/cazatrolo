// Copia exacta de public.calcular_puntaje (supabase/schema.sql).
// El puntaje oficial SIEMPRE lo calcula el servidor; esta versión solo sirve
// para mostrar una vista previa antes de enviar la caza.

export const PUNTOS_LOCAL = 1
export const PUNTOS_FORANEO = 2
export const MULTIPLICADOR_GRUPAL = 1.5

/** bases: puntos base de cada cazado que SÍ cuenta (1 local, 2 foráneo). */
export function calcularPuntaje(bases: number[]): number {
  if (bases.length === 0) return 0
  const suma = bases.reduce((a, b) => a + b, 0)
  return bases.length >= 2 ? suma * MULTIPLICADOR_GRUPAL : suma
}

export function puntajeCazados(cazados: { foraneo: boolean; enEspera?: boolean }[]): number {
  return calcularPuntaje(
    cazados.filter((c) => !c.enEspera).map((c) => (c.foraneo ? PUNTOS_FORANEO : PUNTOS_LOCAL)),
  )
}

export function formatoPuntos(n: number): string {
  return Number(n).toLocaleString('es-CL', { maximumFractionDigits: 1 })
}
