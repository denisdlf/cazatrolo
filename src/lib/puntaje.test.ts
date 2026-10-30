import { describe, expect, it } from 'vitest'
import { calcularPuntaje, formatoPuntos, puntajeCazados } from './puntaje'

const L = { foraneo: false }
const F = { foraneo: true }

describe('puntaje (ejemplos del reglamento)', () => {
  it('1 cazado local = 1 pt', () => expect(puntajeCazados([L])).toBe(1))
  it('2 locales = (1+1)×1,5 = 3 pts', () => expect(puntajeCazados([L, L])).toBe(3))
  it('3 locales = 4,5 pts', () => expect(puntajeCazados([L, L, L])).toBe(4.5))
  it('1 foráneo = 2 pts', () => expect(puntajeCazados([F])).toBe(2))
  it('1 local + 1 foráneo = (1+2)×1,5 = 4,5 pts', () => expect(puntajeCazados([L, F])).toBe(4.5))
})

describe('tiempo de espera en fotos grupales', () => {
  it('los que están en espera no suman ni activan el multiplicador', () =>
    expect(puntajeCazados([{ ...L, enEspera: true }, F])).toBe(2))
  it('todos en espera = 0', () => expect(puntajeCazados([{ ...L, enEspera: true }])).toBe(0))
  it('2 foráneos + 1 en espera = 6', () =>
    expect(puntajeCazados([F, F, { ...L, enEspera: true }])).toBe(6))
})

describe('utilidades', () => {
  it('lista vacía = 0', () => expect(calcularPuntaje([])).toBe(0))
  it('formato chileno con coma decimal', () => expect(formatoPuntos(4.5)).toBe('4,5'))
})
