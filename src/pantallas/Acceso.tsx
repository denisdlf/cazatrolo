import { useState } from 'react'
import { api } from '../lib/api'
import { mensajeError } from '../lib/errores'
import { useSesion } from '../lib/sesion'
import { Aviso, PinInput } from '../componentes/comunes'
import { ir } from '../lib/ruta'

const leerCodigo = () => {
  try {
    return localStorage.getItem('cazatrolo-codigo') ?? ''
  } catch {
    return ''
  }
}

/** Primera vez que se usa la app: el admin crea el grupo. */
export function ConfigurarGrupo() {
  const { recargar } = useSesion()
  const [codigo, setCodigo] = useState('')
  const [nombre, setNombre] = useState('')
  const [ciudad, setCiudad] = useState('Concepción')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  const enviar = async () => {
    setEnviando(true)
    setError('')
    try {
      await api.configurarGrupo(codigo, nombre, ciudad, pin)
      localStorage.setItem('cazatrolo-codigo', codigo)
      await recargar()
    } catch (e) {
      setError(mensajeError(e))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="acceso">
      <h1 className="logo">CAZATROLO</h1>
      <div className="tarjeta">
        <h2>👑 Configurar el grupo</h2>
        <p className="suave">Esto se hace una sola vez. Quien lo haga queda como administrador.</p>
        <label>Código del grupo (lo compartirás con tus amigos)</label>
        <input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Ej: TROLOS2026" />
        <label>Tu nombre</label>
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <label>Tu ciudad</label>
        <input value={ciudad} onChange={(e) => setCiudad(e.target.value)} />
        <label>Tu PIN de 4 dígitos</label>
        <PinInput valor={pin} onChange={setPin} />
        <Aviso>{error}</Aviso>
        <button className="btn btn-grande" disabled={enviando || !codigo || !nombre || !ciudad || pin.length !== 4} onClick={enviar}>
          Crear grupo
        </button>
      </div>
    </div>
  )
}

/** Código de grupo → elegir nombre → PIN (y ciudad la primera vez). */
export function Ingresar() {
  const { recargar } = useSesion()
  const [codigo, setCodigo] = useState(leerCodigo)
  const [nombres, setNombres] = useState<{ id: string; nombre: string; registrado: boolean }[] | null>(null)
  const [elegido, setElegido] = useState<{ id: string; nombre: string; registrado: boolean } | null>(null)
  const [pin, setPin] = useState('')
  const [pin2, setPin2] = useState('')
  const [ciudad, setCiudad] = useState('Concepción')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  const verificarCodigo = async () => {
    setEnviando(true)
    setError('')
    try {
      setNombres(await api.listaNombres(codigo))
      localStorage.setItem('cazatrolo-codigo', codigo)
    } catch (e) {
      setError(mensajeError(e))
    } finally {
      setEnviando(false)
    }
  }

  const entrar = async () => {
    if (!elegido) return
    if (!elegido.registrado && pin !== pin2) return setError('Los PIN no coinciden')
    setEnviando(true)
    setError('')
    try {
      const r = await api.ingresar(codigo, elegido.id, pin, elegido.registrado ? undefined : ciudad)
      if (r === 'OK') return await recargar()
      if (r.startsWith('BLOQUEADO')) setError(`Demasiados intentos. Espera ${r.split(':')[1]} min ⏳`)
      else setError(mensajeError(r))
      setPin('')
    } catch (e) {
      setError(mensajeError(e))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="acceso">
      <h1 className="logo">CAZATROLO</h1>
      <p className="lema">Ve a un amigo. Sácale foto. Humíllalo con puntos.</p>
      <button className="btn-link" onClick={() => ir('/instrucciones')}>📖 ¿Cómo se juega?</button>

      {!nombres && (
        <div className="tarjeta">
          <h2>🔐 Código del grupo</h2>
          <input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Código secreto" autoFocus
            onKeyDown={(e) => e.key === 'Enter' && verificarCodigo()} />
          <Aviso>{error}</Aviso>
          <button className="btn btn-grande" disabled={!codigo || enviando} onClick={verificarCodigo}>
            Entrar
          </button>
        </div>
      )}

      {nombres && !elegido && (
        <div className="tarjeta">
          <h2>¿Quién eres?</h2>
          <div className="lista-nombres">
            {nombres.map((n) => (
              <button key={n.id} className="btn-nombre" onClick={() => setElegido(n)}>
                {n.nombre} {!n.registrado && <small>(nuevo)</small>}
              </button>
            ))}
          </div>
          <button className="btn-link" onClick={() => setNombres(null)}>← Cambiar código</button>
        </div>
      )}

      {elegido && (
        <div className="tarjeta">
          <h2>Hola, {elegido.nombre} 👋</h2>
          {elegido.registrado ? (
            <>
              <label>Tu PIN</label>
              <PinInput valor={pin} onChange={setPin} autoFocus />
            </>
          ) : (
            <>
              <p className="suave">Primera vez: crea tu PIN para que nadie se haga pasar por ti.</p>
              <label>Crea tu PIN (4 números)</label>
              <PinInput valor={pin} onChange={setPin} autoFocus />
              <label>Repítelo</label>
              <PinInput valor={pin2} onChange={setPin2} />
              <label>¿En qué ciudad vives?</label>
              <input value={ciudad} onChange={(e) => setCiudad(e.target.value)} />
              <p className="suave">Si no es Concepción quedas como <b>foráneo</b> y cazarte vale doble 😈</p>
            </>
          )}
          <Aviso>{error}</Aviso>
          <button className="btn btn-grande" disabled={pin.length !== 4 || enviando || (!elegido.registrado && !ciudad.trim())} onClick={entrar}>
            {elegido.registrado ? 'Entrar' : 'Crear y entrar'}
          </button>
          <button className="btn-link" onClick={() => { setElegido(null); setPin(''); setPin2(''); setError('') }}>
            ← No soy yo
          </button>
        </div>
      )}
    </div>
  )
}
