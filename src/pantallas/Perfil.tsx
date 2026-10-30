import { useState } from 'react'
import { api } from '../lib/api'
import { mensajeError } from '../lib/errores'
import { formatoPuntos } from '../lib/puntaje'
import { ir } from '../lib/ruta'
import { useSesion } from '../lib/sesion'
import { useDatos } from '../lib/useDatos'
import { Aviso, Encabezado, PinInput } from '../componentes/comunes'

export function Perfil() {
  const { perfil, recargar } = useSesion()
  const { datos } = useDatos(async () => {
    const [ranking, hist] = await Promise.all([api.ranking(), api.historial()])
    return {
      mes: ranking.find((r) => r.miembro_id === perfil.id),
      lugar: ranking.findIndex((r) => r.miembro_id === perfil.id) + 1,
      copas: hist.filter((h) => h.ganador_id === perfil.id).length,
      historico: hist.reduce(
        (acc, h) => {
          const f = h.ranking.find((r) => r.miembro_id === perfil.id)
          return f ? { puntos: acc.puntos + f.puntos, cazas: acc.cazas + f.cazas, cazado: acc.cazado + f.veces_cazado } : acc
        },
        { puntos: 0, cazas: 0, cazado: 0 },
      ),
    }
  })
  const [actual, setActual] = useState('')
  const [nuevo, setNuevo] = useState('')
  const [msg, setMsg] = useState<{ t: 'ok' | 'error'; m: string } | null>(null)

  const cambiarPin = async () => {
    try {
      await api.cambiarPin(actual, nuevo)
      setMsg({ t: 'ok', m: 'PIN cambiado ✅' })
      setActual('')
      setNuevo('')
    } catch (e) {
      setMsg({ t: 'error', m: mensajeError(e) })
    }
  }

  const salir = async () => {
    if (!confirm('¿Cerrar sesión en este teléfono?')) return
    await api.salir().catch(() => {})
    await recargar()
  }

  return (
    <div className="pantalla">
      <Encabezado titulo="Mi perfil" />
      <div className="tarjeta perfil-cabecera">
        <div className="avatar">{perfil.nombre.charAt(0).toUpperCase()}</div>
        <h2>{perfil.nombre}</h2>
        <p>📍 {perfil.ciudad} {perfil.foraneo && <span className="tag-foraneo">✈️ Foráneo</span>}</p>
        {perfil.es_admin && <p>👑 Administrador</p>}
      </div>

      {datos && (
        <div className="tarjeta">
          <h2>Este mes</h2>
          <div className="stats">
            <div><b>{datos.lugar || '–'}°</b><small>lugar</small></div>
            <div><b>{formatoPuntos(datos.mes?.puntos ?? 0)}</b><small>puntos</small></div>
            <div><b>{datos.mes?.cazas ?? 0}</b><small>cazas</small></div>
            <div><b>{datos.mes?.veces_cazado ?? 0}</b><small>cazado</small></div>
          </div>
          <h2>Meses anteriores</h2>
          <div className="stats">
            <div><b>{datos.copas}</b><small>🏆 copas</small></div>
            <div><b>{formatoPuntos(datos.historico.puntos)}</b><small>puntos</small></div>
            <div><b>{datos.historico.cazas}</b><small>cazas</small></div>
            <div><b>{datos.historico.cazado}</b><small>cazado</small></div>
          </div>
        </div>
      )}

      <div className="tarjeta">
        <h2>🔑 Cambiar PIN</h2>
        <label>PIN actual</label>
        <PinInput valor={actual} onChange={setActual} />
        <label>PIN nuevo</label>
        <PinInput valor={nuevo} onChange={setNuevo} />
        <Aviso tipo={msg?.t}>{msg?.m}</Aviso>
        <button className="btn" disabled={actual.length !== 4 || nuevo.length !== 4} onClick={cambiarPin}>Cambiar PIN</button>
      </div>

      <button className="btn btn-secundario" onClick={() => ir('/instrucciones')}>📖 Instrucciones del juego</button>
      {perfil.es_admin && <button className="btn btn-grande" onClick={() => ir('/admin')}>👑 Panel de administración</button>}
      <button className="btn btn-secundario" onClick={salir}>Cerrar sesión</button>
    </div>
  )
}
