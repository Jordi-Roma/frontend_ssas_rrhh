import { apiRequest, buildQuery } from '../../../shared/api/httpClient'

export type TipoEntrevista = 'TECNICA' | 'TELEFONICA' | 'VIRTUAL' | 'PRESENCIAL' | 'PSICOLOGICA'
export type ModalidadEntrevista = 'VIRTUAL' | 'PRESENCIAL' | 'TELEFONICA'
export type EstadoEntrevista = 'PROGRAMADA' | 'CONFIRMADA' | 'REALIZADA' | 'CANCELADA'
export const TIPOS_ENTREVISTA: TipoEntrevista[] = ['TECNICA', 'TELEFONICA', 'VIRTUAL', 'PRESENCIAL', 'PSICOLOGICA']
export const MODALIDADES_ENTREVISTA: ModalidadEntrevista[] = ['VIRTUAL', 'PRESENCIAL', 'TELEFONICA']
export type Entrevistador = { id: string; nombre: string; rol: string }
export type PostulacionOpcion = { id: string; nombre_postulante: string; vacante: string }
export type EntrevistaFormData = { postulacion_id: string; entrevistador_id: string; tipo: TipoEntrevista; fecha_hora: string; duracion_min: number; modalidad: ModalidadEntrevista; enlace_reunion: string; lugar: string }
export type ResultadoEntrevista = { puntaje: number; observaciones: string; recomendacion: string }
export type Entrevista = Omit<EntrevistaFormData, 'enlace_reunion' | 'lugar'> & { enlace_reunion: string | null; lugar: string | null; id: string; estado: EstadoEntrevista; puntaje: number | null; observaciones: string | null; recomendacion: string | null; nombre_postulante?: string; entrevistador_nombre?: string }
export type EntrevistaFilters = { page?: number; per_page?: number; estado?: string; postulacion_id?: string; entrevistador_id?: string; fecha_desde?: string; fecha_hasta?: string }
export function normalizeEntrevista(item: Entrevista): Entrevista { return { ...item, puntaje: item.puntaje == null ? null : Number(item.puntaje) } }
export function getEntrevistas(filters: EntrevistaFilters = {}, empresaId?: string) {
  const { page = 1, per_page = 10, fecha_desde, fecha_hasta, estado, postulacion_id } = filters
  return apiRequest<{ items: Entrevista[]; total: number }>(`/api/v1/entrevistas${buildQuery({ offset: (page - 1) * per_page, limit: per_page, desde: fecha_desde, hasta: fecha_hasta, estado, postulacion_id, empresa_id: empresaId })}`).then(data => ({ ...data, items: data.items.map(normalizeEntrevista) }))
}
export function getOpcionesEntrevistas(empresaId?: string) {
  return apiRequest<{ entrevistadores: Entrevistador[]; postulaciones: PostulacionOpcion[] }>(`/api/v1/entrevistas/opciones${buildQuery({ empresa_id: empresaId })}`)
}
export function crearEntrevista(data: EntrevistaFormData, empresaId?: string) {
  return apiRequest<Entrevista>(`/api/v1/entrevistas${buildQuery({ empresa_id: empresaId })}`, { method: 'POST', body: data }).then(normalizeEntrevista)
}
export function actualizarEntrevista(id: string, data: EntrevistaFormData, empresaId?: string) {
  return apiRequest<Entrevista>(`/api/v1/entrevistas/${encodeURIComponent(id)}${buildQuery({ empresa_id: empresaId })}`, { method: 'PATCH', body: data }).then(normalizeEntrevista)
}
export function cambiarEstadoEntrevista(id: string, estado: EstadoEntrevista, empresaId?: string) {
  return apiRequest<Entrevista>(`/api/v1/entrevistas/${encodeURIComponent(id)}/estado${buildQuery({ empresa_id: empresaId })}`, { method: 'PATCH', body: { estado } }).then(normalizeEntrevista)
}
export function registrarResultadoEntrevista(id: string, data: ResultadoEntrevista, empresaId?: string) {
  return apiRequest<Entrevista>(`/api/v1/entrevistas/${encodeURIComponent(id)}/resultado${buildQuery({ empresa_id: empresaId })}`, { method: 'PATCH', body: data }).then(normalizeEntrevista)
}
export function fechaLocal(value: string) {
  const date = new Date(value)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}
