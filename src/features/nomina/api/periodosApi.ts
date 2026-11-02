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

export function abrirPeriodo(gestion: number, mes: number, empresaId?: string | null) {
  return apiRequest<Periodo>(
    `/api/v1/nomina/periodos${buildQuery({ empresa_id: empresaId })}`,
    { method: 'POST', body: { gestion, mes } },
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

export type DatosTributarios = {
  empleado_id: string
  f110_credito: number
  saldo_favor_anterior: number
  mantenimiento_valor: number
  saldo_siete_rg: number
  f110_siete_rg: number
  referencia_planilla: string
}

export function registrarDatosTributarios(periodoId: string, datos: DatosTributarios, empresaId?: string | null) {
  return apiRequest(
    `/api/v1/nomina/periodos/${encodeURIComponent(periodoId)}/rc-iva/datos${buildQuery({ empresa_id: empresaId })}`,
    { method: 'PUT', body: datos },
  )
}
