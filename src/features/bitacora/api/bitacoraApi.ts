import { apiRequest } from '../../../shared/api/httpClient'
import type { components } from '../../../shared/api/schema'

export type AuditFilters = {
  empresa_id?: string
  user_id?: string
  module?: string
  action?: string
  start_date?: string
  end_date?: string
  page?: number
  per_page?: number
}

export const bitacoraApi = {
  list(filters: AuditFilters = {}) {
    const query = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') query.set(key, String(value))
    })
    return apiRequest<components['schemas']['AuditLogPageSchema']>(
      `/api/v1/bitacora${query.size ? `?${query}` : ''}`,
    )
  },
  get(id: string, empresaId?: string) {
    const query = empresaId ? `?empresa_id=${encodeURIComponent(empresaId)}` : ''
    return apiRequest<components['schemas']['AuditLogSchema']>(`/api/v1/bitacora/${id}${query}`)
  },
}
