import { useEffect } from 'react'
import { App as CapApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { SplashScreen } from '@capacitor/splash-screen'
import { ir, useRuta } from './lib/ruta'
import { SesionProvider, useSesion } from './lib/sesion'
import { Cargando } from './componentes/comunes'
import { ConfigurarGrupo, Ingresar } from './pantallas/Acceso'
import { Inicio } from './pantallas/Inicio'
import { Cazar } from './pantallas/Cazar'
import { Ranking } from './pantallas/Ranking'
import { Galeria } from './pantallas/Galeria'
import { Detalle } from './pantallas/Detalle'
import { Historial, MesArchivado } from './pantallas/Historial'
import { Perfil } from './pantallas/Perfil'
import { Admin } from './pantallas/Admin'
import { Instrucciones } from './pantallas/Instrucciones'

const PESTANAS = [
  { ruta: '', icono: '🏠', texto: 'Inicio' },
  { ruta: 'ranking', icono: '🏆', texto: 'Ranking' },
  { ruta: 'galeria', icono: '🖼️', texto: 'Galería' },
  { ruta: 'historial', icono: '📚', texto: 'Historial' },
  { ruta: 'perfil', icono: '😎', texto: 'Perfil' },
]

function Contenido() {
  const { estado, recargar } = useSesion()
  const [p0 = '', p1] = useRuta()

  useEffect(() => {
    if (estado.tipo !== 'cargando') SplashScreen.hide().catch(() => {})
  }, [estado.tipo])

  if (p0 === 'instrucciones' && estado.tipo !== 'dentro') return <Instrucciones />

  switch (estado.tipo) {
    case 'cargando':
      return <Cargando texto="Afinando la puntería…" />
    case 'sin_config':
      return (
        <div className="pantalla">
          <div className="aviso aviso-error">
            Falta configurar Supabase: crea el archivo <code>.env</code> con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY (ver README).
          </div>
        </div>
      )
    case 'error':
      return (
        <div className="pantalla centro">
          <h1 className="logo">CAZATROLO</h1>
          <div className="aviso aviso-error">No pudimos conectar 📶<br /><small>{estado.mensaje}</small></div>
          <button className="btn btn-grande" onClick={recargar}>Reintentar</button>
        </div>
      )
    case 'sin_grupo':
      return <ConfigurarGrupo />
    case 'fuera':
      return <Ingresar />
  }

  if (p0 === 'cazar') return <Cazar />

  let pantalla
  if (p0 === 'ranking') pantalla = <Ranking />
  else if (p0 === 'galeria') pantalla = <Galeria />
  else if (p0 === 'caza' && p1) pantalla = <Detalle id={p1} />
  else if (p0 === 'historial' && p1) pantalla = <MesArchivado periodo={p1} />
  else if (p0 === 'historial') pantalla = <Historial />
  else if (p0 === 'perfil') pantalla = <Perfil />
  else if (p0 === 'admin') pantalla = <Admin />
  else if (p0 === 'instrucciones') pantalla = <Instrucciones />
  else pantalla = <Inicio />

  return (
    <>
      <main key={`${p0}/${p1 ?? ''}`}>{pantalla}</main>
      <nav className="pestanas">
        {PESTANAS.map((t) => (
          <button key={t.ruta} className={p0 === t.ruta || (t.ruta === 'galeria' && p0 === 'caza') ? 'activa' : ''} onClick={() => ir(`/${t.ruta}`)}>
            <span>{t.icono}</span>
            <small>{t.texto}</small>
          </button>
        ))}
      </nav>
    </>
  )
}

export default function App() {
  // Botón "atrás" de Android dentro del APK
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    const h = CapApp.addListener('backButton', () => {
      const enInicio = window.location.hash.replace(/^#\/?/, '') === ''
      if (enInicio) CapApp.exitApp()
      else history.back()
    })
    return () => {
      h.then((x) => x.remove())
    }
  }, [])

  return (
    <SesionProvider>
      <Contenido />
    </SesionProvider>
  )
}
