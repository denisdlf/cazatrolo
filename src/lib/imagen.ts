/** Redimensiona un canvas/video a un lado mayor máximo y lo devuelve como JPEG. */
export function aJpeg(fuente: CanvasImageSource & { width?: number; height?: number }, ancho: number, alto: number, ladoMax: number, calidad: number): Promise<Blob> {
  const escala = Math.min(1, ladoMax / Math.max(ancho, alto))
  const c = document.createElement('canvas')
  c.width = Math.round(ancho * escala)
  c.height = Math.round(alto * escala)
  const ctx = c.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(fuente, 0, 0, c.width, c.height)
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('No se pudo comprimir la foto'))), 'image/jpeg', calidad))
}

/** Foto principal (~1280 px, JPEG 80 %) y miniatura (~400 px) para la galería. */
export async function prepararFotos(canvas: HTMLCanvasElement) {
  const foto = await aJpeg(canvas, canvas.width, canvas.height, 1280, 0.8)
  const miniatura = await aJpeg(canvas, canvas.width, canvas.height, 400, 0.7)
  return { foto, miniatura }
}

export function cargarImagen(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => res(img)
    img.onerror = () => rej(new Error('No se pudo cargar la imagen'))
    img.src = src
  })
}
