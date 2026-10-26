import { apiRequest, buildQuery } from './httpClient'
import type { components } from './schema'

export type Empleado = components['schemas']['EmpleadoResponse']

export function getEmpleados(empresaId?: string | null, offset = 0, limit = 50) {
  return apiRequest<Empleado[]>(`/api/v1/empleados${buildQuery({ empresa_id: empresaId, offset, limit })}`)
}

export function getEmpleado(id: string, empresaId?: string | null) {
  return apiRequest<Empleado>(`/api/v1/empleados/${encodeURIComponent(id)}${buildQuery({ empresa_id: empresaId })}`)
}

export function nombreCompleto(empleado: Empleado): string {
  return [empleado.nombres, empleado.apellido_paterno, empleado.apellido_materno].filter(Boolean).join(' ')
}
