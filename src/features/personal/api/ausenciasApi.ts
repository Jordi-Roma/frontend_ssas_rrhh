import { apiRequest, buildQuery } from '../../../shared/api/httpClient'
import type { components, paths } from '../../../shared/api/schema'
import { boolean, list, numeric, record, text, type GetResponse } from '../../../shared/api/responseValidation'

export type AsignarSaldo = components['schemas']['VacationBalanceInput']

function parseTipo(value: unknown) {
  const row = record(value)
  return { id: text(row.id), codigo: text(row.codigo), nombre: text(row.nombre),
    es_remunerado: boolean(row.es_remunerado), descuenta_vacacion: boolean(row.descuenta_vacacion),
    requiere_documento: boolean(row.requiere_documento ?? false), activo: boolean(row.activo ?? true),
    dias_maximos_anio: row.dias_maximos_anio == null ? null : numeric(row.dias_maximos_anio) }
}

function parseSaldo(value: unknown) {
  const row = record(value)
  return { gestion: numeric(row.gestion), dias_asignados: numeric(row.dias_asignados), dias_usados: numeric(row.dias_usados) }
}

export type TipoAusencia = ReturnType<typeof parseTipo>
export type TipoAusenciaInput = Pick<TipoAusencia, 'codigo' | 'nombre' | 'es_remunerado' | 'descuenta_vacacion' | 'requiere_documento' | 'dias_maximos_anio'>
export type SaldoVacaciones = ReturnType<typeof parseSaldo>
export type MiAusencia = {
  id: string
  tipo_ausencia_id: string
  fecha_inicio: string
  fecha_fin: string
  dias_solicitados: number
  dias_descontados: number | null
  estado: string
  observacion_jefe: string | null
}
export type NuevaAusencia = { tipo_ausencia_id: string; fecha_inicio: string; fecha_fin: string; motivo: string; documento_id?: string }
type SaldoResponse = paths['/api/v1/personal/empleados/{empleado_id}/vacaciones/{gestion}']['put']['responses'][200]['content']['application/json']

export async function getTiposAusencia(empresaId?: string | null) {
  return list(await apiRequest<GetResponse<'/api/v1/personal/tipos-ausencia'>>(
    `/api/v1/personal/tipos-ausencia${buildQuery({ empresa_id: empresaId })}`,
  ), parseTipo)
}

export async function getTiposAusenciaConfiguracion(empresaId: string) {
  return list(await apiRequest<unknown>(`/api/v1/personal/tipos-ausencia/configuracion${buildQuery({ empresa_id: empresaId })}`), parseTipo)
}

export async function crearTipoAusencia(empresaId: string, data: TipoAusenciaInput) {
  return parseTipo(await apiRequest<unknown>(`/api/v1/personal/tipos-ausencia${buildQuery({ empresa_id: empresaId })}`, { method: 'POST', body: data }))
}

export async function editarTipoAusencia(empresaId: string, id: string, data: Omit<TipoAusenciaInput, 'codigo'> & { activo: boolean }) {
  return parseTipo(await apiRequest<unknown>(`/api/v1/personal/tipos-ausencia/${encodeURIComponent(id)}${buildQuery({ empresa_id: empresaId })}`, { method: 'PUT', body: data }))
}

export function getMisAusencias() {
  return apiRequest<MiAusencia[]>('/api/v1/personal/mi/ausencias')
}

export function solicitarAusencia(data: NuevaAusencia) {
  return apiRequest<{ id: string; estado: string }>('/api/v1/personal/mi/ausencias', { method: 'POST', body: data })
}

export function subirComprobantePropio(file: File) {
  const form = new FormData()
  form.append('archivo', file)
  return apiRequest<{ id: string }>('/api/v1/personal/mi/documentos', { method: 'POST', formData: form })
}

export async function asignarSaldoVacaciones(empleadoId: string, gestion: number, data: AsignarSaldo, empresaId?: string | null) {
  return parseSaldo(await apiRequest<SaldoResponse>(
    `/api/v1/personal/empleados/${encodeURIComponent(empleadoId)}/vacaciones/${gestion}${buildQuery({ empresa_id: empresaId })}`,
    { method: 'PUT', body: { ...data, gestion } },
  ))
}
