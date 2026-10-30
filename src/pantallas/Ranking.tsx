import { api, type FilaRanking } from '../lib/api'
import { formatoPuntos } from '../lib/puntaje'
import { useSesion } from '../lib/sesion'
import { nombreMes } from '../lib/tiempo'
import { useDatos } from '../lib/useDatos'
import { Aviso, Cargando, Encabezado, Medalla } from '../componentes/comunes'

export function TablaRanking({ filas }: { filas: FilaRanking[] }) {
  const { perfil } = useSesion()
  return (
    <div className="tabla-ranking">
      <div className="fila cabecera">
        <span />
        <span>Nombre</span>
        <span title="Puntos">Pts</span>
        <span title="Cazas hechas">📸</span>
        <span title="Veces cazado">🎯</span>
      </div>
      {filas.map((f, i) => (
        <div key={f.miembro_id} className={`fila ${perfil && f.miembro_id === perfil.id ? 'yo' : ''}`}>
          <Medalla lugar={i} />
          <span className="nombre">{f.nombre}</span>
          <span className="pts">
            {formatoPuntos(f.puntos)}
            {f.puntos_disputa > 0 && <small className="disputa"> +{formatoPuntos(f.puntos_disputa)}⚖️</small>}
          </span>
          <span>{f.cazas}</span>
          <span>{f.veces_cazado}</span>
        </div>
      ))}
      <p className="suave leyenda">📸 cazas hechas · 🎯 veces cazado · ⚖️ puntos en disputa (aún no suman)</p>
    </div>
  )
}

export function Ranking() {
  const { perfil } = useSesion()
  const { datos, error } = useDatos(() => api.ranking())
  return (
    <div className="pantalla">
      <Encabezado titulo={`Ranking · ${nombreMes(perfil.periodo)}`} />
      <Aviso>{error}</Aviso>
      {datos ? <TablaRanking filas={datos} /> : !error && <Cargando />}
    </div>
  )
}
