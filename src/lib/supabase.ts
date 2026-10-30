import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const configFaltante = !url || !key

export const supabase = createClient(url ?? 'http://falta-configurar', key ?? 'falta', {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'cazatrolo-auth' },
})

/** Cada teléfono tiene un usuario anónimo de Supabase; el PIN lo une a un integrante. */
export async function asegurarSesionAnonima(): Promise<void> {
  const { data } = await supabase.auth.getSession()
  if (data.session) return
  const { error } = await supabase.auth.signInAnonymously()
  if (error) throw error
}
