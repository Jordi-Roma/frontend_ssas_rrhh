import { apiRequest, buildQuery } from '../../../shared/api/httpClient'

export type Periodo = {
  id: string
  gestion: number
  mes: number
  estado: string
}

export function getPeriodos(empresaId?: string | null) {
  return apiRequest<Periodo[]>(
    `/api/v1/nomina/periodos${buildQuery({ empresa_id: empresaId })}`,
  )
}

export function calcularPeriodo(periodoId: string, empresaId?: string | null) {
  return apiRequest(
    `/api/v1/nomina/periodos/${encodeURIComponent(periodoId)}/calcular${buildQuery({ empresa_id: empresaId })}`,
    { method: 'POST' },
  )
}

export function aprobarPeriodo(periodoId: string, empresaId?: string | null) {
  return apiRequest(
    `/api/v1/nomina/periodos/${encodeURIComponent(periodoId)}/aprobar${buildQuery({ empresa_id: empresaId })}`,
    { method: 'POST' },
  )
}