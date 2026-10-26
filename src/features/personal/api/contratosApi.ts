import { apiRequest, buildQuery } from '../../../shared/api/httpClient'
import type { components, paths } from '../../../shared/api/schema'
import { decimal, list, nullableText, numeric, record, text, type GetResponse } from '../../../shared/api/responseValidation'

export type CrearContrato = components['schemas']['ContractInput']

/** Campos comprobados contra contract_dict del backend; OpenAPI devuelve unknown. */
export function parseContrato(value: unknown) {
  const row = record(value)
  return {
    id: text(row.id), empresa_id: text(row.empresa_id), empleado_id: text(row.empleado_id),
    cargo_id: text(row.cargo_id), departamento_id: text(row.departamento_id),
    jefe_directo_id: nullableText(row.jefe_directo_id), contrato_anterior_id: nullableText(row.contrato_anterior_id),
    numero_contrato: text(row.numero_contrato), tipo_contrato: text(row.tipo_contrato),
    modalidad: text(row.modalidad), jornada: text(row.jornada),
    hora_entrada_programada: text(row.hora_entrada_programada), horas_jornada: decimal(row.horas_jornada),
    minutos_descanso: numeric(row.minutos_descanso), salario_basico: decimal(row.salario_basico),
    moneda: text(row.moneda), fecha_inicio: text(row.fecha_inicio), fecha_fin: nullableText(row.fecha_fin),
    motivo_cambio: nullableText(row.motivo_cambio), estado: text(row.estado), creado_en: text(row.creado_en),
  }
}

export type Contrato = ReturnType<typeof parseContrato>
type AltaResponse = paths['/api/v1/personal/empleados/{empleado_id}/contratos']['post']['responses'][201]['content']['application/json']

export async function getContratos(empleadoId: string, empresaId?: string | null) {
  const data = await apiRequest<GetResponse<'/api/v1/personal/empleados/{empleado_id}/contratos'>>(
    `/api/v1/personal/empleados/${encodeURIComponent(empleadoId)}/contratos${buildQuery({ empresa_id: empresaId })}`,
  )
  return list(data, parseContrato)
}

export async function crearContrato(empleadoId: string, data: CrearContrato, empresaId?: string | null) {
  return parseContrato(await apiRequest<AltaResponse>(
    `/api/v1/personal/empleados/${encodeURIComponent(empleadoId)}/contratos${buildQuery({ empresa_id: empresaId })}`,
    { method: 'POST', body: data },
  ))
}

export async function getMisContratos() {
  return list(await apiRequest<GetResponse<'/api/v1/personal/mi/contratos'>>('/api/v1/personal/mi/contratos'), parseContrato)
}
