import { apiRequest, buildQuery } from '../../../shared/api/httpClient'
import type { components } from '../../../shared/api/schema'

export type Postulante = components['schemas']['PostulanteResponse']
export type PostulanteRequest = components['schemas']['CrearPostulanteRequest']

export function listarPostulantes(empresaId?: string, filters: { q?: string; en_banco_talento?: boolean; experiencia_min?: number; habilidad_id?: string; offset?: number; limit?: number } = {}) {
  return apiRequest<Postulante[]>(`/api/v1/postulantes${buildQuery({ ...filters, empresa_id: empresaId })}`)
}

export function crearPostulante(data: PostulanteRequest, empresaId?: string) {
  return apiRequest<Postulante>(`/api/v1/postulantes${buildQuery({ empresa_id: empresaId })}`, { method: 'POST', body: data })
}

export function obtenerPostulante(id: string, empresaId?: string) {
  return apiRequest<Postulante>(`/api/v1/postulantes/${encodeURIComponent(id)}${buildQuery({ empresa_id: empresaId })}`)
}
export function actualizarBancoTalento(id: string, enBanco: boolean, empresaId?: string) {
  return apiRequest<Postulante>(`/api/v1/postulantes/${encodeURIComponent(id)}/banco-talento${buildQuery({ empresa_id: empresaId })}`, { method: 'PATCH', body: { en_banco_talento: enBanco } })
}
export function asociarVacante(id: string, vacanteId: string, empresaId?: string) {
  return apiRequest<{ id: string; vacante_id: string; estado: string }>(`/api/v1/postulantes/${encodeURIComponent(id)}/postulaciones${buildQuery({ empresa_id: empresaId })}`, { method: 'POST', body: { vacante_id: vacanteId } })
}
