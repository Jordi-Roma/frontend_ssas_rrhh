import { apiRequest, buildQuery } from './httpClient'
import type { components } from './schema'

export type Departamento = components['schemas']['DepartamentoResponse']
export type Cargo = components['schemas']['CargoResponse']

// Catálogos de lectura compartidos: Personal y Organización no se importan entre sí.
export function getDepartamentos(empresaId?: string | null) {
  return apiRequest<Departamento[]>(`/api/v1/departamentos${buildQuery({ empresa_id: empresaId })}`)
}

export function getCargos(empresaId?: string | null) {
  return apiRequest<Cargo[]>(`/api/v1/cargos${buildQuery({ empresa_id: empresaId })}`)
}
