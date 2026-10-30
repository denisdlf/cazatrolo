import { useEffect, useRef, useState } from 'react'
import { api, subirFoto } from '../lib/api'
import { mensajeError } from '../lib/errores'
import { prepararFotos } from '../lib/imagen'
import { formatoPuntos, puntajeCazados } from '../lib/puntaje'
import { ir } from '../lib/ruta'
import { useSesion } from '../lib/sesion'
import { duracion } from '../lib/tiempo'
import { Aviso } from '../componentes/comunes'

type Paso = 'camara' | 'elegir' | 'enviando' | 'listo'

export function Cazar() {
  const { perfil, miembros } = useSesion()
  const video = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const [frontal, setFrontal] = useState(false)
  const [paso, setPaso] = useState<Paso>('camara')
  const [errorCamara, setErrorCamara] = useState('')
  const [captura, setCaptura] = useState<HTMLCanvasElement | null>(null)
  const [vista, setVista] = useState('')
  const [elegidos, setElegidos] = useState<Set<string>>(new Set())
  const [espera, setEspera] = useState<Record<string, number>>({})
  const [error, setError] = useState('')
  const [resultado, setResultado] = useState<{ id: string; puntos: number } | null>(null)

  // Cámara en vivo (no se permite elegir desde la galería)
  useEffect(() => {
    if (paso !== 'camara') return
    let cancelado = false
    setErrorCamara('')
    navigator.mediaDevices
      ?.getUserMedia({
        video: { facingMode: frontal ? 'user' : 'environment', width: { ideal: 1920 }, height: { ideal: 1920 } },
        audio: false,
      })
      .then((s) => {
        if (cancelado) return s.getTracks().forEach((t) => t.stop())
        stream.current = s
        if (video.current) {
          video.current.srcObject = s
          video.current.play().catch(() => {})
        }
      })
      .catch((e) =>
        setErrorCamara(
          e?.name === 'NotAllowedError'
            ? 'Sin permiso para usar la cámara. Actívalo en los ajustes del teléfono para esta app.'
            : 'No se pudo abrir la cámara 📷',
        ),
      )
    if (!navigator.mediaDevices) setErrorCamara('Este navegador no permite usar la cámara (se necesita https).')
    return () => {
      cancelado = true
      stream.current?.getTracks().forEach((t) => t.stop())
      stream.current = null
    }
  }, [paso, frontal])

  // Tiempos de espera vigentes (se descuentan cada segundo)
  useEffect(() => {
    api.tiemposEspera().then((t) => setEspera(Object.fromEntries(t.map((x) => [x.cazado_id, x.segundos_restantes])))).catch(() => {})
    const i = setInterval(
      () => setEspera((e) => Object.fromEntries(Object.entries(e).map(([k, v]) => [k, v - 1]).filter(([, v]) => (v as number) > 0))),
      1000,
    )
    return () => clearInterval(i)
  }, [])

  const disparar = () => {
    const v = video.current
    if (!v || !v.videoWidth) return
    const c = document.createElement('canvas')
    c.width = v.videoWidth
    c.height = v.videoHeight
    const ctx = c.getContext('2d')!
    if (frontal) {
      ctx.translate(c.width, 0)
      ctx.scale(-1, 1)
    }
    ctx.drawImage(v, 0, 0)
    setCaptura(c)
    setVista(c.toDataURL('image/jpeg', 0.7))
    setPaso('elegir')
  }

  const victimas = miembros.filter((m) => m.id !== perfil.id)
  const seleccion = victimas.filter((m) => elegidos.has(m.id))
  const previa = puntajeCazados(seleccion.map((m) => ({ foraneo: m.foraneo, enEspera: (espera[m.id] ?? 0) > 0 })))
  const todosEnEspera = seleccion.length > 0 && previa === 0

  const alternar = (id: string) =>
    setElegidos((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  const registrar = async () => {
    if (!captura) return
    setPaso('enviando')
    setError('')
    try {
      const { foto, miniatura } = await prepararFotos(captura)
      const base = `${perfil.id}/${crypto.randomUUID()}`
      await Promise.all([subirFoto(`${base}.jpg`, foto), subirFoto(`${base}_m.jpg`, miniatura)])
      setResultado(await api.registrarCaza(`${base}.jpg`, `${base}_m.jpg`, [...elegidos]))
      setPaso('listo')
    } catch (e) {
      setError(mensajeError(e))
      setPaso('elegir')
    }
  }

  if (paso === 'camara')
    return (
      <div className="camara">
        <video ref={video} playsInline muted className={frontal ? 'espejo' : ''} />
        {errorCamara && <div className="camara-error">{errorCamara}</div>}
        <div className="camara-controles">
          <button className="btn-circulo" onClick={() => history.back()} aria-label="Cancelar">✕</button>
          <button className="obturador" onClick={disparar} disabled={!!errorCamara} aria-label="Sacar foto" />
          <button className="btn-circulo" onClick={() => setFrontal((f) => !f)} aria-label="Cambiar cámara">🔄</button>
        </div>
      </div>
    )

  if (paso === 'listo' && resultado)
    return (
      <div className="pantalla centro">
        <div className="festejo">🎉</div>
        <h1 className="titulo-arcoiris">¡CAZADO!</h1>
        <p className="puntos-gigantes">+{formatoPuntos(resultado.puntos)} pts</p>
        <button className="btn btn-grande" onClick={() => ir(`/caza/${resultado.id}`)}>Ver y compartir 📲</button>
        <button className="btn btn-secundario" onClick={() => ir('/')}>Volver al inicio</button>
      </div>
    )

  return (
    <div className="pantalla elegir">
      <img src={vista} className="vista-previa" alt="Tu foto" />
      <h2>¿A quién cazaste?</h2>
      <div className="lista-victimas">
        {victimas.map((m) => {
          const seg = espera[m.id] ?? 0
          const sel = elegidos.has(m.id)
          return (
            <button key={m.id} className={`victima ${sel ? 'sel' : ''} ${seg > 0 ? 'en-espera' : ''}`} onClick={() => alternar(m.id)}>
              <span className="victima-nombre">{m.nombre}</span>
              {m.foraneo && <span className="tag-foraneo">✈️ x2</span>}
              {seg > 0 && <span className="tag-espera">⏳ {duracion(seg)}</span>}
            </button>
          )
        })}
      </div>
      {seleccion.some((m) => (espera[m.id] ?? 0) > 0) && !todosEnEspera && (
        <Aviso tipo="info">Los que están en espera ⏳ salen en la foto pero no suman puntos.</Aviso>
      )}
      {todosEnEspera && (
        <Aviso>
          Aún no puedes volver a cazar a {seleccion.map((m) => m.nombre).join(', ')}. Falta{' '}
          {duracion(Math.min(...seleccion.map((m) => espera[m.id] ?? 0)))}.
        </Aviso>
      )}
      <Aviso>{error}</Aviso>
      <div className="barra-accion">
        <button className="btn btn-secundario" onClick={() => setPaso('camara')} disabled={paso === 'enviando'}>
          📷 Otra
        </button>
        <button className="btn btn-grande" disabled={!seleccion.length || todosEnEspera || paso === 'enviando'} onClick={registrar}>
          {paso === 'enviando' ? 'Subiendo…' : `¡Registrar! +${formatoPuntos(previa)}`}
        </button>
      </div>
    </div>
  )
}
