import { apiRequest } from '../../../shared/api/httpClient'

export type Notificacion = { id: string; tipo: string; titulo: string; mensaje: string; fecha: string; leida_en: string | null; ruta: string | null }
export const notificacionesApi = {
  listar: () => apiRequest<Notificacion[]>('/api/v1/notificaciones/mi'),
  leer: (id: string) => apiRequest<void>(`/api/v1/notificaciones/${encodeURIComponent(id)}/leer`, { method: 'PATCH' }),
  leerTodas: () => apiRequest<void>('/api/v1/notificaciones/leer-todas', { method: 'POST' }),
}
