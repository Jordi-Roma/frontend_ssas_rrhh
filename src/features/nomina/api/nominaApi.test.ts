import { afterEach, describe, expect, it, vi } from 'vitest'
import { boleta } from '../../../test/sprint3Fixtures'
import { getBoleta, getMiBoleta, parseBoleta } from './nominaApi'
import { formatearBs, formatearFecha } from '../../../shared/utils/formato'

afterEach(() => vi.unstubAllGlobals())
describe('Límite HTTP de nómina', () => {
  it('rechaza importes ausentes y conceptos desconocidos en lugar de imprimir valores inventados', () => {
    expect(() => parseBoleta({ ...boleta, liquido_pagable: null })).toThrow(/formato esperado/)
    expect(() => parseBoleta({ ...boleta, detalle: [{ ...boleta.detalle[0], tipo: 'DESCONOCIDO' }] })).toThrow(/concepto desconocido/)
    expect(() => parseBoleta(null)).toThrow(/formato esperado/)
  })
  it('conserva los importes recibidos, admite decimales JSON y aplica el alcance solo en RRHH', async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify(boleta), { status: 200 })))
    vi.stubGlobal('fetch', fetchMock)
    expect((await getBoleta('boleta/demo', 'empresa demo')).liquido_pagable).toBe('7812.45')
    expect(fetchMock.mock.calls[0][0]).toContain('/api/v1/nomina/boletas/boleta%2Fdemo?empresa_id=empresa+demo')
    await getMiBoleta('boleta-demo')
    expect(fetchMock.mock.calls[1][0]).toContain('/api/v1/nomina/mi/boletas/boleta-demo')
    expect(fetchMock.mock.calls[1][0]).not.toContain('empresa_id')
    expect(parseBoleta({ ...boleta, liquido_pagable: 7812.45 }).liquido_pagable).toBe(7812.45)
  })
  it('formatea importes y fechas sin tratar el dato inválido como cero', () => {
    expect(formatearBs('7812.45')).toBe('7.812,45'); expect(formatearBs('')).toBe('—'); expect(formatearBs('NaN')).toBe('—')
    expect(formatearFecha('2026-10-01')).toContain('2026'); expect(formatearFecha(null)).toBe('—')
  })
})
