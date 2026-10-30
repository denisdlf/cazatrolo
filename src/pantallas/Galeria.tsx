import { useState } from 'react'
import { api, type Caza } from '../lib/api'
import { formatoPuntos } from '../lib/puntaje'
import { ir } from '../lib/ruta'
import { useSesion } from '../lib/sesion'
import { fechaHora, nombreMes } from '../lib/tiempo'
import { useDatos } from '../lib/useDatos'
import { Aviso, Cargando, Encabezado, EstadoChip, Foto } from '../componentes/comunes'

export function GrillaCazas({ cazas }: { cazas: Caza[] }) {
  const { miembros } = useSesion()
  const [cazador, setCazador] = useState('')
  const [cazado, setCazado] = useState('')
  const lista = cazas.filter(
    (c) => (!cazador || c.cazador_id === cazador) && (!cazado || c.cazados.some((x) => x.id === cazado)),
  )
  const nombres = new Map<string, string>()
  for (const m of miembros) nombres.set(m.id, m.nombre)
  for (const c of cazas) {
    nombres.set(c.cazador_id, c.cazador)
    for (const x of c.cazados) nombres.set(x.id, x.nombre)
  }
  const opciones = [...nombres].sort((a, b) => a[1].localeCompare(b[1]))

  return (
    <>
      <div className="filtros">
        <select value={cazador} onChange={(e) => setCazador(e.target.value)}>
          <option value="">📸 Todos los cazadores</option>
          {opciones.map(([id, n]) => <option key={id} value={id}>{n}</option>)}
        </select>
        <select value={cazado} onChange={(e) => setCazado(e.target.value)}>
          <option value="">🎯 Todos los cazados</option>
          {opciones.map(([id, n]) => <option key={id} value={id}>{n}</option>)}
        </select>
      </div>
      {lista.length === 0 && <p className="centro suave">Nada por aquí todavía… ¡sal a cazar! 🏹</p>}
      <div className="grilla">
        {lista.map((c) => (
          <button key={c.id} className={`miniatura estado-${c.estado}`} onClick={() => ir(`/caza/${c.id}`)}>
            <Foto path={c.miniatura_path ?? c.foto_path} />
            <div className="miniatura-info">
              <b>{c.cazador}</b> → {c.cazados.map((x) => x.nombre).join(', ')}
              <small>{fechaHora(c.creado_en)} · +{formatoPuntos(c.puntos)}</small>
              {c.estado !== 'valida' && <EstadoChip estado={c.estado} />}
            </div>
          </button>
        ))}
      </div>
    </>
  )
}

export function Galeria() {
  const { perfil } = useSesion()
  const { datos, error } = useDatos(() => api.cazas())
  return (
    <div className="pantalla">
      <Encabezado titulo={`Galería · ${nombreMes(perfil.periodo)}`} />
      <Aviso>{error}</Aviso>
      {datos ? <GrillaCazas cazas={datos} /> : !error && <Cargando />}
    </div>
  )
}
