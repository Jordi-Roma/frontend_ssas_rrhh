import { apiRequest, buildQuery, downloadFile } from '../../../shared/api/httpClient'
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

export type AuditIntegrity = {
  valid: boolean
  checked_records: number
  first_invalid_id: string | null
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
  verify(empresaId?: string) {
    return apiRequest<AuditIntegrity>(`/api/v1/bitacora/integridad${buildQuery({ empresa_id: empresaId })}`)
  },
  exportEncrypted(empresaId?: string) {
    return downloadFile(
      `/api/v1/bitacora/exportar-cifrada${buildQuery({ empresa_id: empresaId })}`,
      'bitacora.jsonl.enc',
    )
  },
}
