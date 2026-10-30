import { Capacitor } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'

function blobABase64(blob: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(String(r.result).split(',')[1])
    r.onerror = () => rej(r.error)
    r.readAsDataURL(blob)
  })
}

/** Abre el menú de compartir de Android con la imagen y el texto. */
export async function compartirImagen(blob: Blob, texto: string, nombre = 'caza-trolos.jpg'): Promise<'ok' | 'descargada'> {
  if (Capacitor.isNativePlatform()) {
    const archivo = await Filesystem.writeFile({
      path: nombre,
      data: await blobABase64(blob),
      directory: Directory.Cache,
    })
    await Share.share({ text: texto, files: [archivo.uri], dialogTitle: 'Compartir caza' })
    return 'ok'
  }

  const file = new File([blob], nombre, { type: 'image/jpeg' })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text: texto })
    } catch (e) {
      if ((e as Error).name !== 'AbortError') throw e
    }
    return 'ok'
  }

  // Computador u otro navegador sin soporte: descarga la imagen y copia el texto
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = nombre
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 5000)
  await navigator.clipboard?.writeText(texto).catch(() => {})
  return 'descargada'
}
