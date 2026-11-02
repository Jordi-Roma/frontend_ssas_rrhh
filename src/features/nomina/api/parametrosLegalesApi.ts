import { apiRequest } from '../../../shared/api/httpClient'

export type TasaLegal = {
  id: string
  codigo: string
  vigente_desde: string
  vigente_hasta: string
  porcentaje: string | number | null
  monto: string | number | null
  norma_legal: string | null
}

export type VigenciaLegal = {
  vigente_desde: string
  vigente_hasta: string
  norma_legal: string
}

export function getTasasLegales() {
  return apiRequest<TasaLegal[]>('/api/v1/nomina/parametros-legales')
}

export function crearTasaLegal(codigo: string, data: VigenciaLegal & { porcentaje: number }) {
  return apiRequest(`/api/v1/nomina/parametros-legales/${encodeURIComponent(codigo)}`, {
    method: 'POST', body: data,
  })
}

export function registrarSalarioMinimo(data: VigenciaLegal & { monto: number }) {
  return apiRequest('/api/v1/nomina/salario-minimo', { method: 'POST', body: data })
}
