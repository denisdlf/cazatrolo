const MENSAJES: Record<string, string> = {
  NO_SESION: 'Tu sesión expiró. Vuelve a entrar.',
  NO_ADMIN: 'Solo el admin puede hacer eso.',
  YA_CONFIGURADO: 'El grupo ya estaba configurado.',
  CODIGO_CORTO: 'El código debe tener al menos 4 caracteres.',
  CODIGO_INCORRECTO: 'Código de grupo incorrecto 🤨',
  PIN_INVALIDO: 'El PIN debe ser de 4 números.',
  PIN_INCORRECTO: 'PIN incorrecto. ¿Seguro que eres tú? 🕵️',
  FALTA_CIUDAD: 'Indica tu ciudad.',
  MIEMBRO_NO_EXISTE: 'Ese nombre ya no está en la lista.',
  SIN_CAZADOS: 'Elige al menos a una víctima.',
  AUTOCAZA: 'No te puedes cazar a ti mismo, narciso.',
  FOTO_INVALIDA: 'La foto no se subió bien. Intenta de nuevo.',
  CAZADOS_INVALIDOS: 'Algún cazado no es válido.',
  TODOS_EN_ESPERA: 'Todos los que elegiste están en tiempo de espera ⏳',
  CAZA_NO_EXISTE: 'Esa caza no existe.',
  NO_ERES_CAZADO: 'Solo un cazado puede impugnar.',
  YA_ANULADA: 'Esa caza ya está anulada.',
  FUERA_DE_PLAZO: 'Ya pasaron las 24 horas para impugnar.',
  YA_IMPUGNADA: 'Esa caza ya fue impugnada.',
  SIN_IMPUGNACION: 'Esa caza no está en disputa.',
  VOTACION_CERRADA: 'La votación ya cerró.',
  NO_PUEDES_VOTAR: 'Cazador y cazados no votan.',
  NOMBRE_VACIO: 'Escribe un nombre.',
  NO_PUEDES_QUITARTE: 'No te puedes quitar a ti mismo.',
}

export function mensajeError(e: unknown): string {
  const raw = e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : String(e)
  if (MENSAJES[raw]) return MENSAJES[raw]
  if (/fetch|network|Failed to/i.test(raw)) return 'Sin conexión. Revisa tu internet 📶'
  return raw || 'Algo falló 🤷'
}
