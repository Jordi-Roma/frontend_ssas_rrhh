import { apiRequest, buildQuery } from '../../../shared/api/httpClient'
import type { components } from '../../../shared/api/schema'

type Role = components['schemas']['RoleSchema']

export const rolesApi = {
  list: (empresaId?: string) => apiRequest<Role[]>(`/api/v1/roles${empresaId ? `?empresa_id=${encodeURIComponent(empresaId)}` : ''}`),
  permisos: () => apiRequest<components['schemas']['PermisoSchema'][]>('/api/v1/permisos'),
  create: (data: components['schemas']['CreateRoleRequest'], empresaId?: string) =>
    apiRequest<Role>(`/api/v1/roles${buildQuery({ empresa_id: empresaId })}`, { method: 'POST', body: data }),
  update: (id: string, data: components['schemas']['UpdateRoleRequest'], empresaId?: string) =>
    apiRequest<Role>(`/api/v1/roles/${id}${buildQuery({ empresa_id: empresaId })}`, { method: 'PATCH', body: data }),
  remove: (id: string, empresaId?: string) =>
    apiRequest<void>(`/api/v1/roles/${id}${buildQuery({ empresa_id: empresaId })}`, { method: 'DELETE' }),
  assignPermissions: (id: string, permissionIds: string[], empresaId?: string) =>
    apiRequest<Role>(`/api/v1/roles/${id}/permissions${buildQuery({ empresa_id: empresaId })}`, {
      method: 'PUT', body: { permission_ids: permissionIds },
    }),
}
