import { api } from '../lib/api'
import { formatoPuntos } from '../lib/puntaje'
import { ir } from '../lib/ruta'
import { nombreMes } from '../lib/tiempo'
import { useDatos } from '../lib/useDatos'
import { Aviso, Cargando, Encabezado } from '../componentes/comunes'
import { TablaRanking } from './Ranking'
import { GrillaCazas } from './Galeria'

export function Historial() {
  const { datos, error } = useDatos(() => api.historial())
  return (
    <div className="pantalla">
      <Encabezado titulo="Historial" />
      <Aviso>{error}</Aviso>
      {!datos && !error && <Cargando />}
      {datos?.length === 0 && <p className="centro suave">Aún no termina ningún mes. La historia se está escribiendo… ✍️</p>}
      {datos?.map((p) => (
        <button key={p.periodo} className="tarjeta mes-archivado" onClick={() => ir(`/historial/${p.periodo}`)}>
          <small>{nombreMes(p.periodo)} · {p.total_cazas} cazas</small>
          {p.ganador ? (
            <b>👑 {p.ganador} · {formatoPuntos(p.ganador_puntos ?? 0)} pts</b>
          ) : (
            <b>Sin ganador</b>
          )}
          <span>🏆 {p.premio}</span>
        </button>
      ))}
    </div>
  )
}

export function MesArchivado({ periodo }: { periodo: string }) {
  const { datos, error } = useDatos(async () => {
    const [hist, cazas] = await Promise.all([api.historial(), api.cazas(periodo)])
    return { mes: hist.find((h) => h.periodo === periodo), cazas }
  }, [periodo])
  return (
    <div className="pantalla">
      <Encabezado titulo={nombreMes(periodo)} volver="/historial" />
      <Aviso>{error}</Aviso>
      {!datos && !error && <Cargando />}
      {datos?.mes && (
        <>
          <div className="tarjeta ganador">
            <div className="corona">👑</div>
            <h2>{datos.mes.ganador ?? 'Sin ganador'}</h2>
            {datos.mes.ganador && <p>{formatoPuntos(datos.mes.ganador_puntos ?? 0)} pts</p>}
            <p>🏆 {datos.mes.premio}</p>
          </div>
          <TablaRanking filas={datos.mes.ranking} />
          <h2>Galería</h2>
          <GrillaCazas cazas={datos.cazas} />
        </>
      )}
    </div>
  )
}
