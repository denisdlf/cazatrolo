import { useState } from 'react'
import { api } from '../lib/api'
import { mensajeError } from '../lib/errores'
import { ir } from '../lib/ruta'
import { useSesion } from '../lib/sesion'
import { Aviso, Encabezado } from '../componentes/comunes'

export function Admin() {
  const { perfil, miembros, recargar } = useSesion()
  const [nuevo, setNuevo] = useState('')
  const [premio, setPremio] = useState(perfil.premio)
  const [codigo, setCodigo] = useState('')
  const [msg, setMsg] = useState<{ t: 'ok' | 'error'; m: string } | null>(null)

  if (!perfil.es_admin) return <div className="pantalla"><Aviso>Solo para el admin 👑</Aviso></div>

  const hacer = async (f: () => Promise<unknown>, ok: string) => {
    setMsg(null)
    try {
      await f()
      await recargar()
      setMsg({ t: 'ok', m: ok })
    } catch (e) {
      setMsg({ t: 'error', m: mensajeError(e) })
    }
  }

  return (
    <div className="pantalla">
      <Encabezado titulo="👑 Admin" volver="/perfil" />
      <Aviso tipo={msg?.t}>{msg?.m}</Aviso>

      <div className="tarjeta">
        <h2>🏆 Premio del mes</h2>
        <input value={premio} onChange={(e) => setPremio(e.target.value)} />
        <button className="btn" onClick={() => hacer(() => api.admin.premio(premio), 'Premio actualizado')}>Guardar premio</button>
      </div>

      <div className="tarjeta">
        <h2>👥 Integrantes ({miembros.length})</h2>
        {miembros.map((m) => (
          <div key={m.id} className="fila-admin">
            <div>
              <b>{m.nombre}</b> {m.es_admin && '👑'}
              <small>
                {m.ciudad ?? 'sin ciudad'} {m.foraneo && '✈️'} · {m.registrado ? 'con PIN' : 'aún no entra'}
              </small>
            </div>
            <div className="botones-chicos">
              <button onClick={() => {
                const c = prompt(`Ciudad de ${m.nombre}`, m.ciudad ?? '')
                if (c !== null) hacer(() => api.admin.editarCiudad(m.id, c), 'Ciudad actualizada')
              }}>📍</button>
              <button onClick={() => confirm(`¿Resetear el PIN de ${m.nombre}? Tendrá que crear uno nuevo.`) && hacer(() => api.admin.resetearPin(m.id), 'PIN reseteado')}>🔑</button>
              {m.id !== perfil.id && (
                <button onClick={() => confirm(`¿Quitar a ${m.nombre} del grupo? Sus cazas pasadas se conservan.`) && hacer(() => api.admin.quitar(m.id), 'Integrante quitado')}>🗑️</button>
              )}
            </div>
          </div>
        ))}
        <p className="suave">📍 editar ciudad · 🔑 resetear PIN · 🗑️ quitar</p>
        <div className="fila-input">
          <input placeholder="Nombre nuevo" value={nuevo} onChange={(e) => setNuevo(e.target.value)} />
          <button className="btn" disabled={!nuevo.trim()} onClick={() => hacer(() => api.admin.agregar(nuevo), `${nuevo} agregado`).then(() => setNuevo(''))}>Agregar</button>
        </div>
      </div>

      <div className="tarjeta">
        <h2>❌ Anular cazas</h2>
        <p className="suave">Abre cualquier caza desde la Galería: como admin verás el botón “Anular caza”.</p>
        <button className="btn btn-secundario" onClick={() => ir('/galeria')}>Ir a la galería</button>
      </div>

      <div className="tarjeta">
        <h2>🔐 Código del grupo</h2>
        <input placeholder="Nuevo código" value={codigo} onChange={(e) => setCodigo(e.target.value)} />
        <button className="btn btn-secundario" disabled={codigo.trim().length < 4} onClick={() => hacer(() => api.admin.codigo(codigo), 'Código cambiado')}>Cambiar código</button>
      </div>
    </div>
  )
}
