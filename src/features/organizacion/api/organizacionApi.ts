import { apiRequest } from '../../../shared/api/httpClient'
import type { components } from '../../../shared/api/schema'

export type Departamento = components['schemas']['DepartamentoResponse']
export type Cargo = components['schemas']['CargoResponse']
export type CrearDepartamento = components['schemas']['CrearDepartamentoRequest']
export type ActualizarDepartamento = components['schemas']['ActualizarDepartamentoRequest']
export type CrearCargo = components['schemas']['CrearCargoRequest']
export type ActualizarCargo = components['schemas']['ActualizarCargoRequest']

export { getDepartamentos, getCargos } from '../../../shared/api/organizacionCatalogosApi'

function scope(empresaId?: string | null) {
  return empresaId ? `?empresa_id=${encodeURIComponent(empresaId)}` : ''
}

export function crearDepartamento(data: CrearDepartamento, empresaId?: string | null) {
  return apiRequest<Departamento>(`/api/v1/departamentos${scope(empresaId)}`, {
    method: 'POST', body: data,
  })
}

export function actualizarDepartamento(id: string, data: ActualizarDepartamento, empresaId?: string | null) {
  return apiRequest<Departamento>(`/api/v1/departamentos/${id}${scope(empresaId)}`, {
    method: 'PUT', body: data,
  })
}

export function eliminarDepartamento(id: string, empresaId?: string | null) {
  return apiRequest<void>(`/api/v1/departamentos/${id}${scope(empresaId)}`, { method: 'DELETE' })
}

export function crearCargo(data: CrearCargo, empresaId?: string | null) {
  return apiRequest<Cargo>(`/api/v1/cargos${scope(empresaId)}`, { method: 'POST', body: data })
}

export function actualizarCargo(id: string, data: ActualizarCargo, empresaId?: string | null) {
  return apiRequest<Cargo>(`/api/v1/cargos/${id}${scope(empresaId)}`, { method: 'PUT', body: data })
}

export function eliminarCargo(id: string, empresaId?: string | null) {
  return apiRequest<void>(`/api/v1/cargos/${id}${scope(empresaId)}`, { method: 'DELETE' })
}
