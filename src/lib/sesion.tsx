import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, type Miembro, type Perfil } from './api'
import { asegurarSesionAnonima, configFaltante } from './supabase'
import { sincronizarReloj } from './tiempo'

type Estado =
  | { tipo: 'cargando' }
  | { tipo: 'sin_config' }
  | { tipo: 'error'; mensaje: string }
  | { tipo: 'sin_grupo' }
  | { tipo: 'fuera' }
  | { tipo: 'dentro'; perfil: Perfil; miembros: Miembro[] }

type Ctx = {
  estado: Estado
  recargar: () => Promise<void>
  perfil: Perfil
  miembros: Miembro[]
}

const SesionCtx = createContext<Ctx | null>(null)

export function SesionProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<Estado>({ tipo: 'cargando' })

  const recargar = useCallback(async () => {
    if (configFaltante) return setEstado({ tipo: 'sin_config' })
    try {
      await asegurarSesionAnonima()
      const perfil = await api.miPerfil()
      if (perfil) {
        sincronizarReloj(perfil.ahora)
        const miembros = await api.miembros()
        return setEstado({ tipo: 'dentro', perfil, miembros })
      }
      setEstado((await api.grupoConfigurado()) ? { tipo: 'fuera' } : { tipo: 'sin_grupo' })
    } catch (e) {
      setEstado({ tipo: 'error', mensaje: e instanceof Error ? e.message : String(e) })
    }
  }, [])

  useEffect(() => {
    recargar()
  }, [recargar])

  const valor: Ctx = {
    estado,
    recargar,
    perfil: estado.tipo === 'dentro' ? estado.perfil : (null as unknown as Perfil),
    miembros: estado.tipo === 'dentro' ? estado.miembros : [],
  }
  return <SesionCtx.Provider value={valor}>{children}</SesionCtx.Provider>
}

export function useSesion() {
  const c = useContext(SesionCtx)
  if (!c) throw new Error('useSesion fuera de SesionProvider')
  return c
}
