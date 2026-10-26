import { apiRequest, buildQuery } from '../../../shared/api/httpClient'
import type { components, paths } from '../../../shared/api/schema'
import { boolean, list, numeric, record, text, type GetResponse } from '../../../shared/api/responseValidation'

export type AsignarSaldo = components['schemas']['VacationBalanceInput']

function parseTipo(value: unknown) {
  const row = record(value)
  return { id: text(row.id), codigo: text(row.codigo), nombre: text(row.nombre),
    es_remunerado: boolean(row.es_remunerado), descuenta_vacacion: boolean(row.descuenta_vacacion) }
}

function parseSaldo(value: unknown) {
  const row = record(value)
  return { gestion: numeric(row.gestion), dias_asignados: numeric(row.dias_asignados), dias_usados: numeric(row.dias_usados) }
}

export type TipoAusencia = ReturnType<typeof parseTipo>
export type SaldoVacaciones = ReturnType<typeof parseSaldo>
type SaldoResponse = paths['/api/v1/personal/empleados/{empleado_id}/vacaciones/{gestion}']['put']['responses'][200]['content']['application/json']

export async function getTiposAusencia(empresaId?: string | null) {
  return list(await apiRequest<GetResponse<'/api/v1/personal/tipos-ausencia'>>(
    `/api/v1/personal/tipos-ausencia${buildQuery({ empresa_id: empresaId })}`,
  ), parseTipo)
}

export async function asignarSaldoVacaciones(empleadoId: string, gestion: number, data: AsignarSaldo, empresaId?: string | null) {
  return parseSaldo(await apiRequest<SaldoResponse>(
    `/api/v1/personal/empleados/${encodeURIComponent(empleadoId)}/vacaciones/${gestion}${buildQuery({ empresa_id: empresaId })}`,
    { method: 'PUT', body: { ...data, gestion } },
  ))
}
