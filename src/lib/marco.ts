import type { Caza } from './api'
import { formatoPuntos } from './puntaje'
import { fechaHora } from './tiempo'
import { cargarImagen } from './imagen'

export const ARCOIRIS = ['#e40303', '#ff8c00', '#ffed00', '#008026', '#004dff', '#750787']

/** Dibuja la caza con marco arcoíris y devuelve un JPEG listo para compartir. */
export async function generarImagenEnmarcada(caza: Caza, urlFoto: string): Promise<Blob> {
  await Promise.all([
    document.fonts.load('64px "Bungee"'),
    document.fonts.load('800 40px "Nunito"'),
  ])
  const foto = await cargarImagen(urlFoto)

  const W = 1080
  const borde = 54
  const interior = W - borde * 2
  const altoFoto = Math.min(Math.round((foto.height / foto.width) * interior), 1300)
  const altoTitulo = 190
  const altoTexto = 330
  const H = borde * 2 + altoTitulo + altoFoto + altoTexto

  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')!

  // Borde: franjas arcoíris concéntricas
  const franja = borde / ARCOIRIS.length
  ARCOIRIS.forEach((color, i) => {
    ctx.fillStyle = color
    const o = i * franja
    ctx.fillRect(o, o, W - o * 2, H - o * 2)
  })
  ctx.fillStyle = '#16051f'
  ctx.fillRect(borde, borde, interior, H - borde * 2)

  // Título con degradado arcoíris
  const grad = ctx.createLinearGradient(borde, 0, W - borde, 0)
  ARCOIRIS.forEach((col, i) => grad.addColorStop(i / (ARCOIRIS.length - 1), col))
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = '96px "Bungee"'
  ctx.lineWidth = 10
  ctx.strokeStyle = '#ffffff'
  ctx.strokeText('CAZA TROLOS', W / 2, borde + altoTitulo / 2)
  ctx.fillStyle = grad
  ctx.fillText('CAZA TROLOS', W / 2, borde + altoTitulo / 2)

  // Foto (recorte centrado si es muy alta)
  const y0 = borde + altoTitulo
  const escala = interior / foto.width
  const srcAlto = altoFoto / escala
  ctx.drawImage(foto, 0, (foto.height - srcAlto) / 2, foto.width, srcAlto, borde, y0, interior, altoFoto)

  // Sello de puntos
  const pts = `+${formatoPuntos(caza.puntos)} pts`
  ctx.save()
  ctx.translate(W - borde - 150, y0 + 110)
  ctx.rotate(-0.18)
  ctx.fillStyle = '#ffed00'
  ctx.beginPath()
  ctx.arc(0, 0, 105, 0, Math.PI * 2)
  ctx.fill()
  ctx.lineWidth = 8
  ctx.strokeStyle = '#e40303'
  ctx.stroke()
  ctx.fillStyle = '#16051f'
  ctx.font = '44px "Bungee"'
  ctx.fillText(pts, 0, 0, 180)
  ctx.restore()

  // Datos
  const y1 = y0 + altoFoto
  const cazados = caza.cazados.map((x) => x.nombre).join(', ')
  ctx.fillStyle = '#ffffff'
  ctx.font = '52px "Bungee"'
  ctx.fillText(`🎯 ${caza.cazador}`, W / 2, y1 + 70, interior - 40)
  ctx.font = '800 42px "Nunito"'
  ctx.fillStyle = '#ffed00'
  ctx.fillText(`cazó a ${cazados}`, W / 2, y1 + 140, interior - 40)
  ctx.fillStyle = '#d9c8ff'
  ctx.font = '700 36px "Nunito"'
  ctx.fillText(fechaHora(caza.creado_en), W / 2, y1 + 205, interior - 40)
  ctx.fillStyle = '#ffffff'
  ctx.font = '30px "Bungee"'
  ctx.fillText('📸 CAZATROLO', W / 2, y1 + 275)

  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('No se pudo generar la imagen'))), 'image/jpeg', 0.88))
}

export function textoCompartir(caza: Caza): string {
  const cazados = caza.cazados.map((x) => x.nombre).join(', ')
  return `¡Cazando trolos! 📸 ${caza.cazador} cazó a ${cazados} (+${formatoPuntos(caza.puntos)} pts)`
}
