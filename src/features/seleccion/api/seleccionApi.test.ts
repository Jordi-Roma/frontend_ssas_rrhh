import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { tokenStorage } from '../../../shared/api/session'
import { ApiError } from '../../../shared/api/httpClient'
import { crearEntrevista, getEntrevistas, registrarResultadoEntrevista } from '../../entrevistas/api/entrevistasApi'
import { actualizarBancoTalento, asociarVacante, crearPostulante } from '../../postulantes/api/postulantesApi'
import { contratarPostulante, getHistorialPostulante } from '../../tablero/api/tableroApi'
import { analizarCV, compararCandidatos, getAnalisis, getEvaluaciones, getEvaluadores, getRanking, guardarEvaluacion } from './seleccionApi'

const fetchMock = vi.fn()
const id = 'd6d6b2d8-22cc-4df8-8b44-8392003f1cdd'
const tenant = '8e2c3d4a-1111-4222-8333-444444444444'
function response(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }) }
function lastRequest() { const [url, init] = fetchMock.mock.calls.at(-1)!; return { url: new URL(url, 'http://localhost'), init, body: init.body ? JSON.parse(init.body) : undefined } }
beforeEach(() => { vi.stubGlobal('fetch', fetchMock); fetchMock.mockReset(); tokenStorage.set({ access_token: 'test-token', refresh_token: 'test-refresh', realm: 'tenant' }) })
afterEach(() => { vi.unstubAllGlobals(); tokenStorage.clear() })

describe('Sprint 2 HTTP contract', () => {
  it('loads evaluators from the evaluation permission endpoint and scopes the company', async () => {
    fetchMock.mockResolvedValue(response([{ id, nombre: 'Ana', rol: 'RRHH' }]))
    expect(await getEvaluadores(tenant)).toEqual([{ id, nombre: 'Ana', rol: 'RRHH' }])
    expect(lastRequest().url.pathname).toBe('/api/v1/evaluaciones/opciones')
    expect(lastRequest().url.searchParams.get('empresa_id')).toBe(tenant)
  })
  it('uses server offsets and scoped UUIDs in the agenda', async () => {
    fetchMock.mockResolvedValue(response({ items: [{ id, puntaje: '75.50' }], total: 23 }))
    const data = await getEntrevistas({ page: 3, per_page: 10, estado: 'REALIZADA', postulacion_id: id, fecha_desde: '2026-09-01T00:00:00Z' }, tenant)
    const { url, init } = lastRequest()
    expect(url.searchParams.get('offset')).toBe('20'); expect(url.searchParams.get('limit')).toBe('10')
    expect(url.searchParams.get('empresa_id')).toBe(tenant); expect(url.searchParams.get('postulacion_id')).toBe(id)
    expect(url.searchParams.get('desde')).toBe('2026-09-01T00:00:00Z'); expect(init.headers.Authorization).toBe('Bearer test-token')
    expect(data.items[0].puntaje).toBe(75.5)
  })
  it('creates a real interview with string UUIDs and timezone', async () => {
    const payload = { postulacion_id: id, entrevistador_id: tenant, tipo: 'TECNICA' as const, fecha_hora: '2026-10-05T15:00:00.000Z', duracion_min: 45, modalidad: 'PRESENCIAL' as const, enlace_reunion: '', lugar: 'Oficina' }
    fetchMock.mockResolvedValue(response({ ...payload, id, puntaje: null }))
    await crearEntrevista(payload, tenant)
    expect(lastRequest().init.method).toBe('POST'); expect(lastRequest().body).toEqual(payload)
  })
  it('records interview results independently of evaluations', async () => {
    fetchMock.mockResolvedValue(response({ id, puntaje: '90' }))
    await registrarResultadoEntrevista(id, { puntaje: 90, observaciones: 'Dominio técnico', recomendacion: 'RECOMENDADO' }, tenant)
    expect(lastRequest().url.pathname).toBe(`/api/v1/entrevistas/${id}/resultado`)
    expect(lastRequest().init.method).toBe('PATCH')
  })
  it('normalizes analysis decimals and fractional experience and tolerates null experience', async () => {
    fetchMock.mockResolvedValue(response([{ id, puntaje_afinidad: '82.30', anios_experiencia_detectados: '2.5' }, { id: tenant, puntaje_afinidad: '60', anios_experiencia_detectados: null }]))
    const data = await getAnalisis(id, tenant)
    expect(data[0].puntaje_afinidad).toBe(82.3); expect(data[0].anios_experiencia_detectados).toBe(2.5); expect(data[1].anios_experiencia_detectados).toBeNull()
  })
  it('propagates provider failures without fabricating analysis', async () => {
    fetchMock.mockResolvedValue(response({ detail: 'Proveedor IA no configurado' }, 503))
    await expect(analizarCV(id, tenant)).rejects.toThrow('Proveedor IA no configurado')
    expect(lastRequest().init.method).toBe('POST')
  })
  it('normalizes evaluation score/max and preserves the designated evaluator on corrections', async () => {
    fetchMock.mockResolvedValue(response([{ id, puntaje: '15.5', puntaje_maximo: '20' }]))
    expect((await getEvaluaciones(id, tenant))[0]).toMatchObject({ puntaje: 15.5, puntaje_maximo: 20 })
    fetchMock.mockResolvedValue(response({ id, puntaje: '16', puntaje_maximo: '20' }))
    await guardarEvaluacion(id, { tipo: 'TECNICA', nombre: 'Prueba', puntaje: 16, puntaje_maximo: 20, aprobado: true, observaciones: 'Revisión', evaluador_id: tenant }, tenant, id)
    expect(lastRequest().url.pathname).toBe(`/api/v1/evaluaciones/${id}`); expect(lastRequest().body.evaluador_id).toBe(tenant)
  })
  it('uses backend ranking order and does not turn pending analysis into zero', async () => {
    fetchMock.mockResolvedValue(response({ items: [{ id, puntaje_ia: null }], total: 1 }))
    const data = await getRanking(id, tenant, { page: 2, per_page: 10, orden: 'evaluaciones' })
    expect(lastRequest().url.searchParams.get('orden')).toBe('evaluaciones'); expect(lastRequest().url.searchParams.get('offset')).toBe('10')
    expect(data.items[0].puntaje_ia).toBeNull()
  })
  it('searches all server pages before paginating search results', async () => {
    fetchMock.mockResolvedValueOnce(response({ items: [{ id, nombre_postulante: 'Ana' }], total: 2 })).mockResolvedValueOnce(response({ items: [{ id: tenant, nombre_postulante: 'Pedro' }], total: 2 }))
    const data = await getRanking(id, tenant, { page: 1, per_page: 10, busqueda: 'pedro', orden: 'ia' })
    expect(data.total).toBe(1); expect(data.items[0].id).toBe(tenant); expect(fetchMock).toHaveBeenCalledTimes(2)
  })
  it('rejects repeated or out-of-range comparison selections before sending', async () => {
    await expect(compararCandidatos(id, [id, id], tenant)).rejects.toThrow()
    await expect(compararCandidatos(id, [id], tenant)).rejects.toThrow()
    expect(fetchMock).not.toHaveBeenCalled()
    fetchMock.mockResolvedValue(response([]))
    await compararCandidatos(id, [id, tenant], tenant)
    expect(lastRequest().body).toEqual({ postulacion_ids: [id, tenant] })
  })
  it('uses the unified history route and exposes permission errors', async () => {
    fetchMock.mockResolvedValue(response({ detail: 'No tienes permiso' }, 403))
    await expect(getHistorialPostulante(id, tenant)).rejects.toBeInstanceOf(ApiError)
    expect(lastRequest().url.pathname).toBe(`/api/v1/postulaciones/${id}/historial`)
  })
  it('updates the existing talent profile and associates a vacancy in the same tenant', async () => {
    fetchMock.mockResolvedValue(response({ id, en_banco_talento: true }))
    await actualizarBancoTalento(id, true, tenant)
    expect(lastRequest().body).toEqual({ en_banco_talento: true }); expect(lastRequest().url.searchParams.get('empresa_id')).toBe(tenant)
    fetchMock.mockResolvedValue(response({ id, vacante_id: tenant }))
    await asociarVacante(id, tenant, tenant)
    expect(lastRequest().body).toEqual({ vacante_id: tenant }); expect(lastRequest().url.pathname).toBe(`/api/v1/postulantes/${id}/postulaciones`)
  })
  it('scopes manual creation and hiring and returns the created employee', async () => {
    fetchMock.mockResolvedValue(response({ id }))
    await crearPostulante({ nombres: 'Ana', apellidos: 'Pérez', ci: '123', email: 'ana@example.test', telefono: '123', ciudad: 'La Paz', nivel_educativo: 'LICENCIATURA', fuente: 'OTRO', anios_experiencia: 3, cv_url: null, linkedin: null }, tenant)
    expect(lastRequest().url.searchParams.get('empresa_id')).toBe(tenant)
    fetchMock.mockResolvedValue(response({ id, codigo: 'EMP-01', nombres: 'Ana' }))
    const employee = await contratarPostulante(id, { codigo: 'EMP-01', apellido_paterno: 'Pérez', apellido_materno: '', ci_expedido: 'LP', fecha_ingreso: '2026-10-01' }, tenant)
    expect(employee.codigo).toBe('EMP-01'); expect(lastRequest().url.pathname).toBe(`/api/v1/postulaciones/${id}/contratar`)
  })
})
