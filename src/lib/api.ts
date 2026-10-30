import { supabase } from './supabase'

export type Perfil = {
  id: string
  nombre: string
  ciudad: string | null
  es_admin: boolean
  foraneo: boolean
  premio: string
  ciudad_local: string
  ahora: string
  periodo: string
}

export type Miembro = {
  id: string
  nombre: string
  ciudad: string | null
  foraneo: boolean
  es_admin: boolean
  registrado: boolean
}

export type Estado = 'valida' | 'en_disputa' | 'anulada'

export type Cazado = { id: string; nombre: string; foraneo: boolean; cuenta: boolean; puntos_base: number }

export type Impugnacion = {
  impugnador_id: string
  impugnador: string
  comentario: string | null
  creado_en: string
  cierra_en: string
  votos_valida: number
  votos_invalida: number
  mi_voto: boolean | null
}

export type Caza = {
  id: string
  cazador_id: string
  cazador: string
  foto_path: string
  miniatura_path: string | null
  creado_en: string
  periodo: string
  puntos: number
  estado: Estado
  anulada_admin: boolean
  anulada_motivo: string | null
  cazados: Cazado[]
  impugnacion: Impugnacion | null
  impugnable_hasta: string
}

export type FilaRanking = {
  miembro_id: string
  nombre: string
  puntos: number
  puntos_disputa: number
  cazas: number
  veces_cazado: number
}

export type PeriodoArchivado = {
  periodo: string
  premio: string
  ganador_id: string | null
  ganador: string | null
  ganador_puntos: number | null
  ranking: FilaRanking[]
  total_cazas: number
}

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args)
  if (error) throw new Error(error.message)
  return data as T
}

const num = (r: FilaRanking): FilaRanking => ({
  ...r,
  puntos: Number(r.puntos),
  puntos_disputa: Number(r.puntos_disputa),
  cazas: Number(r.cazas),
  veces_cazado: Number(r.veces_cazado),
})
const numCaza = (c: Caza): Caza => ({ ...c, puntos: Number(c.puntos) })

export const api = {
  grupoConfigurado: () => rpc<boolean>('grupo_configurado'),
  configurarGrupo: (codigo: string, nombre: string, ciudad: string, pin: string) =>
    rpc<void>('configurar_grupo', { p_codigo: codigo, p_admin_nombre: nombre, p_admin_ciudad: ciudad, p_pin: pin }),
  listaNombres: (codigo: string) =>
    rpc<{ id: string; nombre: string; registrado: boolean }[]>('lista_nombres', { p_codigo: codigo }),
  ingresar: (codigo: string, miembro: string, pin: string, ciudad?: string) =>
    rpc<string>('ingresar', { p_codigo: codigo, p_miembro: miembro, p_pin: pin, p_ciudad: ciudad ?? null }),
  salir: () => rpc<void>('salir'),
  cambiarPin: (actual: string, nuevo: string) => rpc<void>('cambiar_pin', { p_actual: actual, p_nuevo: nuevo }),
  miPerfil: () => rpc<Perfil | null>('mi_perfil'),
  miembros: () => rpc<Miembro[]>('miembros_lista'),
  tiemposEspera: () => rpc<{ cazado_id: string; segundos_restantes: number }[]>('tiempos_espera'),
  registrarCaza: (foto: string, miniatura: string, cazados: string[]) =>
    rpc<{ id: string; puntos: number }>('registrar_caza', {
      p_foto_path: foto,
      p_miniatura_path: miniatura,
      p_cazados: cazados,
    }),
  cazas: async (periodo?: string) => (await rpc<Caza[]>('cazas_lista', { p_periodo: periodo ?? null })).map(numCaza),
  caza: async (id: string) => {
    const r = await rpc<Caza[]>('cazas_lista', { p_caza: id })
    return r[0] ? numCaza(r[0]) : null
  },
  ranking: async (periodo?: string) =>
    (await rpc<FilaRanking[]>('ranking', { p_periodo: periodo ?? null })).map(num),
  historial: async () =>
    (await rpc<PeriodoArchivado[]>('historial')).map((p) => ({ ...p, ranking: p.ranking.map(num) })),
  periodosPorConfirmar: () => rpc<string[]>('periodos_por_confirmar'),
  impugnar: (caza: string, comentario: string) => rpc<void>('impugnar', { p_caza: caza, p_comentario: comentario }),
  votar: (caza: string, valida: boolean) => rpc<void>('votar', { p_caza: caza, p_valida: valida }),
  votacionesPendientes: () => rpc<number>('votaciones_pendientes'),
  admin: {
    agregar: (nombre: string) => rpc<void>('admin_agregar_miembro', { p_nombre: nombre }),
    quitar: (id: string) => rpc<void>('admin_quitar_miembro', { p_id: id }),
    resetearPin: (id: string) => rpc<void>('admin_resetear_pin', { p_id: id }),
    editarCiudad: (id: string, ciudad: string) => rpc<void>('admin_editar_ciudad', { p_id: id, p_ciudad: ciudad }),
    premio: (premio: string) => rpc<void>('admin_set_premio', { p_premio: premio }),
    anular: (caza: string, anular: boolean, motivo: string) =>
      rpc<void>('admin_anular_caza', { p_caza: caza, p_anular: anular, p_motivo: motivo }),
    codigo: (codigo: string) => rpc<void>('admin_set_codigo', { p_codigo: codigo }),
  },
}

// ---- Fotos (bucket privado, URLs firmadas con caché de 50 min) ----
const BUCKET = 'cazas'
const cache = new Map<string, { url: string; vence: number }>()

export async function urlsFirmadas(paths: string[]): Promise<Record<string, string>> {
  const ahora = Date.now()
  const faltan = [...new Set(paths)].filter((p) => !cache.has(p) || cache.get(p)!.vence < ahora)
  if (faltan.length) {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(faltan, 3600)
    if (error) throw error
    for (const d of data ?? []) if (d.path && d.signedUrl) cache.set(d.path, { url: d.signedUrl, vence: ahora + 50 * 60_000 })
  }
  const out: Record<string, string> = {}
  for (const p of paths) {
    const c = cache.get(p)
    if (c) out[p] = c.url
  }
  return out
}

export async function subirFoto(path: string, blob: Blob): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg', upsert: false })
  if (error) throw error
}
