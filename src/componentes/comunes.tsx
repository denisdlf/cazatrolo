import { useEffect, useState, type ReactNode } from 'react'
import { urlsFirmadas, type Estado } from '../lib/api'
import { ir } from '../lib/ruta'

export function Foto({ path, alt = '', className }: { path: string | null; alt?: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let vivo = true
    if (path) urlsFirmadas([path]).then((u) => vivo && setUrl(u[path] ?? null)).catch(() => {})
    return () => {
      vivo = false
    }
  }, [path])
  return url ? <img src={url} alt={alt} className={className} loading="lazy" /> : <div className={`${className ?? ''} foto-cargando`} />
}

const ETIQUETA: Record<Estado, string> = { valida: '✅ Válida', en_disputa: '⚖️ En disputa', anulada: '❌ Anulada' }
export const EstadoChip = ({ estado }: { estado: Estado }) => <span className={`chip chip-${estado}`}>{ETIQUETA[estado]}</span>

export function Encabezado({ titulo, volver }: { titulo: string; volver?: string }) {
  return (
    <header className="encabezado">
      {volver !== undefined && (
        <button className="btn-volver" onClick={() => (volver ? ir(volver) : history.back())} aria-label="Volver">
          ←
        </button>
      )}
      <h1>{titulo}</h1>
    </header>
  )
}

export const Cargando = ({ texto = 'Cargando…' }: { texto?: string }) => (
  <div className="cargando">
    <div className="ruedita" />
    <p>{texto}</p>
  </div>
)

export const Aviso = ({ children, tipo = 'error' }: { children: ReactNode; tipo?: 'error' | 'ok' | 'info' }) =>
  children ? <div className={`aviso aviso-${tipo}`}>{children}</div> : null

export const Medalla = ({ lugar }: { lugar: number }) => <span className="medalla">{['🥇', '🥈', '🥉'][lugar] ?? `${lugar + 1}.`}</span>

export function PinInput({ valor, onChange, autoFocus }: { valor: string; onChange: (v: string) => void; autoFocus?: boolean }) {
  return (
    <input
      className="pin"
      inputMode="numeric"
      type="password"
      pattern="\d{4}"
      maxLength={4}
      autoComplete="off"
      autoFocus={autoFocus}
      placeholder="••••"
      value={valor}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
    />
  )
}
