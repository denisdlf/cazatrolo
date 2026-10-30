import { describe, expect, it } from 'vitest'
import { diasRestantes, duracion, nombreMes } from './tiempo'

describe('tiempo', () => {
  it('días restantes usa hora de Chile', () => {
    // 1 nov 02:00 UTC = 31 oct 23:00 en Chile → queda 1 día de octubre
    expect(diasRestantes('2026-10', new Date('2026-11-01T02:00:00Z'))).toBe(1)
    expect(diasRestantes('2026-10', new Date('2026-10-01T12:00:00Z'))).toBe(31)
  })
  it('nombre del mes', () => expect(nombreMes('2026-10')).toMatch(/^Octubre/))
  it('duración', () => {
    expect(duracion(3599)).toBe('59 min')
    expect(duracion(3700)).toBe('1 h 1 min')
  })
})
