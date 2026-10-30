import type React from 'react'
import { Encabezado } from '../componentes/comunes'

const SECCIONES: { icono: string; titulo: string; texto: React.ReactNode }[] = [
  {
    icono: '🎯',
    titulo: 'La idea',
    texto: <>Cada vez que veas a alguien del grupo, sácale una foto (si no se da cuenta, mejor). Cada caza suma puntos y quien junte más en el mes, gana el premio.</>,
  },
  {
    icono: '📸',
    titulo: 'Cómo cazar',
    texto: (
      <ol>
        <li>Aprieta el botón gigante <b>¡CAZAR!</b></li>
        <li>Saca la foto con la cámara de la app (no se pueden subir fotos de la galería).</li>
        <li>Marca a quién o a quiénes cazaste.</li>
        <li>Aprieta <b>¡Registrar!</b> La fecha y hora las pone el servidor, así que no sirve cambiar la hora del teléfono 😏</li>
      </ol>
    ),
  },
  {
    icono: '🧮',
    titulo: 'Puntaje',
    texto: (
      <>
        <ul>
          <li>Cada cazado vale <b>1 punto</b>.</li>
          <li>Si es <b>foráneo</b> ✈️ (vive fuera de Concepción) vale <b>2 puntos</b>.</li>
          <li>Si en la foto salen <b>2 o más cazados</b>, la suma se multiplica por <b>1,5</b>.</li>
        </ul>
        <table className="tabla-ejemplos">
          <tbody>
            <tr><td>1 local</td><td>1 pt</td></tr>
            <tr><td>2 locales</td><td>(1+1)×1,5 = 3 pts</td></tr>
            <tr><td>3 locales</td><td>4,5 pts</td></tr>
            <tr><td>1 foráneo</td><td>2 pts</td></tr>
            <tr><td>1 local + 1 foráneo</td><td>(1+2)×1,5 = 4,5 pts</td></tr>
          </tbody>
        </table>
      </>
    ),
  },
  {
    icono: '⏳',
    titulo: 'Tiempo de espera',
    texto: (
      <>
        No puedes volver a cazar a la <b>misma persona antes de 1 hora</b>. La espera es tuya: si tú cazaste a Juan, otro sí lo puede cazar al tiro.
        En una foto grupal, los que estén en espera salen en la foto pero <b>no suman</b> (ni cuentan para el ×1,5).
      </>
    ),
  },
  {
    icono: '⚖️',
    titulo: 'Impugnar',
    texto: (
      <>
        Si te cazaron con trampa, tienes <b>24 horas</b> para impugnar desde el detalle de la caza. Ahí se abre una <b>votación de 24 horas</b> para el resto
        del grupo (cazador y cazados no votan). Si gana “inválida”, la caza se anula. Empate o nadie vota = la caza se mantiene. Mientras se vota, sus puntos
        aparecen aparte como “en disputa”.
      </>
    ),
  },
  {
    icono: '🏆',
    titulo: 'Fin de mes',
    texto: (
      <>
        Cada mes parte el día 1 a las 00:00 y termina el último día a las 23:59 (hora de Chile). Gana <b>solo el primer lugar</b>. Como las últimas cazas aún se
        pueden impugnar, el resultado se confirma hasta 48 horas después. Todo queda guardado en <b>Historial</b>.
      </>
    ),
  },
  {
    icono: '📲',
    titulo: 'Compartir',
    texto: <>En cada caza aprieta <b>Compartir</b>: la app arma la foto con marco arcoíris y te deja elegir el grupo de WhatsApp. Tú le das enviar.</>,
  },
  {
    icono: '🔐',
    titulo: 'Tu cuenta',
    texto: <>Entras con el código del grupo, tu nombre y tu PIN de 4 dígitos. Si se te olvida el PIN, pídele al admin que lo resetee. Puedes cambiarlo en Perfil.</>,
  },
]

export function Instrucciones({ volver }: { volver?: string }) {
  return (
    <div className="pantalla instrucciones">
      <Encabezado titulo="¿Cómo se juega?" volver={volver ?? ''} />
      {SECCIONES.map((s) => (
        <section key={s.titulo} className="tarjeta">
          <h2>{s.icono} {s.titulo}</h2>
          <div className="texto-instrucciones">{s.texto}</div>
        </section>
      ))}
      <p className="centro suave">Juega limpio… o al menos que no te pillen 😈</p>
    </div>
  )
}
