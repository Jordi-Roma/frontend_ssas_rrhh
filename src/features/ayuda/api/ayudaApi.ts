import { apiRequest } from '../../../shared/api/httpClient'

export type HelpTopic = { id: string; titulo: string; ruta: string }
export type HelpAnswer = { respuesta: string; fuentes: { titulo: string; ruta: string }[]; modo: 'guia' | 'sin_resultado' | 'ia'; aviso?: string }

export const ayudaApi = {
  topics: () => apiRequest<HelpTopic[]>('/api/v1/ayuda/preguntas'),
  ask: (pregunta: string) => apiRequest<HelpAnswer>('/api/v1/ayuda/consultar', { method: 'POST', body: { pregunta } }),
  explain: (id: string) => apiRequest<HelpAnswer>(`/api/v1/ayuda/articulos/${encodeURIComponent(id)}/explicar`, { method: 'POST' }),
}
