import { api } from '../lib/api'
import { formatoPuntos } from '../lib/puntaje'
import { ir } from '../lib/ruta'
import { useSesion } from '../lib/sesion'
import { diasRestantes, nombreMes } from '../lib/tiempo'
import { useDatos } from '../lib/useDatos'
import { Aviso, Cargando, Medalla } from '../componentes/comunes'

export function Inicio() {
  const { perfil } = useSesion()
  const { datos, error } = useDatos(async () => {
    const [ranking, pendientes, porConfirmar] = await Promise.all([
      api.ranking(),
      api.votacionesPendientes(),
      api.periodosPorConfirmar(),
    ])
    return { ranking, pendientes, porConfirmar }
  })
  const dias = diasRestantes(perfil.periodo)
  const top = datos?.ranking.slice(0, 3) ?? []
  const yo = datos?.ranking.findIndex((r) => r.miembro_id === perfil.id) ?? -1

  return (
    <div className="pantalla inicio">
      <div className="barra-inicio">
        <h1 className="logo logo-chico">CAZATROLO</h1>
        <button className="btn-ayuda" onClick={() => ir('/instrucciones')} aria-label="Instrucciones">❓</button>
      </div>

      <button className="btn-cazar" onClick={() => ir('/cazar')}>
        <span>📸</span>¡CAZAR!
      </button>

      {!!datos?.pendientes && (
        <button className="aviso aviso-info aviso-boton" onClick={() => ir('/galeria')}>
          ⚖️ Tienes {datos.pendientes} votación{datos.pendientes > 1 ? 'es' : ''} pendiente{datos.pendientes > 1 ? 's' : ''}
        </button>
      )}
      {!!datos?.porConfirmar.length && (
        <Aviso tipo="info">
          ⏳ Resultados de {datos.porConfirmar.map(nombreMes).join(', ')} por confirmar (quedan impugnaciones abiertas).
        </Aviso>
      )}

      <div className="tarjeta periodo">
        <div>
          <small>{nombreMes(perfil.periodo)}</small>
          <b>{dias === 1 ? '¡Último día!' : `Quedan ${dias} días`}</b>
        </div>
        <div className="premio">
          <small>Premio</small>
          <b>🏆 {perfil.premio}</b>
        </div>
      </div>

      <Aviso>{error}</Aviso>
      {!datos && !error && <Cargando />}
      {datos && (
        <div className="tarjeta">
          <h2>Ranking del mes</h2>
          <div className="podio">
            {[1, 0, 2].map((i) =>
              top[i] ? (
                <div key={i} className={`podio-${i}`}>
                  <Medalla lugar={i} />
                  <b>{top[i].nombre}</b>
                  <span>{formatoPuntos(top[i].puntos)} pts</span>
                  <div className="podio-base" />
                </div>
              ) : (
                <div key={i} />
              ),
            )}
          </div>
          {yo >= 0 && (
            <p className="centro">
              Tú vas <b>#{yo + 1}</b> con <b>{formatoPuntos(datos.ranking[yo].puntos)} pts</b>
              {datos.ranking[yo].puntos_disputa > 0 && <> (+{formatoPuntos(datos.ranking[yo].puntos_disputa)} en disputa)</>}
            </p>
          )}
          <button className="btn btn-secundario" onClick={() => ir('/ranking')}>Ver ranking completo</button>
        </div>
      )}
    </div>
  )
}
