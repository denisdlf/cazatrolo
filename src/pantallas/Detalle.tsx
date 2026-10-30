import { useEffect, useState } from 'react'
import { api, urlsFirmadas } from '../lib/api'
import { compartirImagen } from '../lib/compartir'
import { mensajeError } from '../lib/errores'
import { generarImagenEnmarcada, textoCompartir } from '../lib/marco'
import { formatoPuntos } from '../lib/puntaje'
import { useSesion } from '../lib/sesion'
import { duracion, fechaHora, segundosHasta } from '../lib/tiempo'
import { useDatos } from '../lib/useDatos'
import { Aviso, Cargando, Encabezado, EstadoChip, Foto } from '../componentes/comunes'

export function Detalle({ id }: { id: string }) {
  const { perfil } = useSesion()
  const { datos: caza, error, recargar } = useDatos(() => api.caza(id), [id])
  const [, tick] = useState(0)
  const [msg, setMsg] = useState<{ t: 'ok' | 'error' | 'info'; m: string } | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [impugnando, setImpugnando] = useState(false)
  const [comentario, setComentario] = useState('')
  const [motivo, setMotivo] = useState('')

  useEffect(() => {
    const i = setInterval(() => tick((x) => x + 1), 30_000)
    return () => clearInterval(i)
  }, [])

  if (error) return <div className="pantalla"><Encabezado titulo="Caza" volver="" /><Aviso>{error}</Aviso></div>
  if (!caza) return <div className="pantalla"><Encabezado titulo="Caza" volver="" /><Cargando /></div>

  const soyCazado = caza.cazados.some((c) => c.id === perfil.id)
  const soyCazador = caza.cazador_id === perfil.id
  const imp = caza.impugnacion
  const puedoImpugnar = soyCazado && !imp && caza.estado === 'valida' && segundosHasta(caza.impugnable_hasta) > 0
  const votacionAbierta = imp && caza.estado === 'en_disputa' && segundosHasta(imp.cierra_en) > 0
  const puedoVotar = votacionAbierta && !soyCazado && !soyCazador

  const accion = async (f: () => Promise<unknown>, ok?: string) => {
    setOcupado(true)
    setMsg(null)
    try {
      await f()
      if (ok) setMsg({ t: 'ok', m: ok })
      await recargar()
    } catch (e) {
      setMsg({ t: 'error', m: mensajeError(e) })
    } finally {
      setOcupado(false)
    }
  }

  const compartir = () =>
    accion(async () => {
      const url = (await urlsFirmadas([caza.foto_path]))[caza.foto_path]
      const img = await generarImagenEnmarcada(caza, url)
      const r = await compartirImagen(img, textoCompartir(caza))
      if (r === 'descargada') setMsg({ t: 'info', m: 'Imagen descargada y texto copiado. Pégalo en WhatsApp 😉' })
    })

  return (
    <div className="pantalla detalle">
      <Encabezado titulo="Caza" volver="" />
      <Foto path={caza.foto_path} className="foto-detalle" />
      <div className="tarjeta">
        <div className="detalle-cabecera">
          <EstadoChip estado={caza.estado} />
          <span className="puntos-chip">+{formatoPuntos(caza.puntos)} pts</span>
        </div>
        <p className="detalle-quien">
          <b>{caza.cazador}</b> cazó a{' '}
          {caza.cazados.map((c, i) => (
            <span key={c.id}>
              {i > 0 && ', '}
              <b className={c.cuenta ? '' : 'tachado'}>{c.nombre}</b>
              {c.foraneo && ' ✈️'}
              {!c.cuenta && <small> (en espera, no sumó)</small>}
            </span>
          ))}
        </p>
        <p className="suave">🕒 {fechaHora(caza.creado_en)}</p>
        {caza.estado === 'anulada' && caza.anulada_motivo && <p>Motivo: {caza.anulada_motivo}</p>}
      </div>

      <Aviso tipo={msg?.t}>{msg?.m}</Aviso>

      <div className="acciones">
        <button className="btn btn-grande btn-whatsapp" disabled={ocupado} onClick={compartir}>
          {ocupado ? 'Preparando…' : '📲 Compartir'}
        </button>
        {puedoImpugnar && !impugnando && (
          <button className="btn btn-secundario" onClick={() => setImpugnando(true)}>
            ⚖️ Impugnar (quedan {duracion(segundosHasta(caza.impugnable_hasta))})
          </button>
        )}
      </div>

      {impugnando && (
        <div className="tarjeta">
          <h2>⚖️ Impugnar caza</h2>
          <p className="suave">El resto del grupo votará durante 24 horas si la caza es válida.</p>
          <textarea placeholder="¿Por qué es trampa? (opcional)" value={comentario} onChange={(e) => setComentario(e.target.value)} maxLength={300} />
          <button className="btn" disabled={ocupado} onClick={() => accion(() => api.impugnar(caza.id, comentario), 'Impugnación enviada. ¡Que decida el pueblo! 🗳️').then(() => setImpugnando(false))}>
            Enviar impugnación
          </button>
          <button className="btn-link" onClick={() => setImpugnando(false)}>Cancelar</button>
        </div>
      )}

      {imp && (
        <div className="tarjeta votacion">
          <h2>🗳️ {votacionAbierta ? 'Votación abierta' : 'Votación cerrada'}</h2>
          <p>
            <b>{imp.impugnador}</b> impugnó esta caza{imp.comentario ? `: “${imp.comentario}”` : '.'}
          </p>
          <div className="marcador">
            <div><b>{imp.votos_valida}</b><small>✅ válida</small></div>
            <div><b>{imp.votos_invalida}</b><small>❌ inválida</small></div>
          </div>
          {votacionAbierta && <p className="suave centro">Cierra en {duracion(segundosHasta(imp.cierra_en))}. Empate o sin votos = la caza se mantiene.</p>}
          {puedoVotar && (
            <div className="botones-voto">
              <button className={`btn ${imp.mi_voto === true ? 'votado' : 'btn-secundario'}`} disabled={ocupado} onClick={() => accion(() => api.votar(caza.id, true))}>
                ✅ Válida
              </button>
              <button className={`btn ${imp.mi_voto === false ? 'votado' : 'btn-secundario'}`} disabled={ocupado} onClick={() => accion(() => api.votar(caza.id, false))}>
                ❌ Inválida
              </button>
            </div>
          )}
          {votacionAbierta && !puedoVotar && <p className="suave centro">Cazador y cazados no votan.</p>}
        </div>
      )}

      {perfil.es_admin && (
        <div className="tarjeta admin-caza">
          <h2>👑 Admin</h2>
          <input placeholder="Motivo (opcional)" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          <button className="btn btn-peligro" disabled={ocupado} onClick={() => accion(() => api.admin.anular(caza.id, !caza.anulada_admin, motivo), 'Listo')}>
            {caza.anulada_admin ? 'Restaurar caza' : 'Anular caza'}
          </button>
        </div>
      )}
    </div>
  )
}
