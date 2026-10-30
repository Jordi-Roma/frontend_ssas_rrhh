import { apiRequest } from '../../../shared/api/httpClient'

export type ChatAnswer = {
  respuesta: string
  fuentes: { id: string; titulo: string }[]
  enlaces?: { titulo: string; ruta: string }[]
  sin_respuesta: boolean
}
export type KnowledgeArticle = { id: string; titulo: string; contenido: string; categoria: string; publico: boolean; publicado: boolean; actualizado_en: string }
export type ArticleInput = Omit<KnowledgeArticle, 'id' | 'actualizado_en'>

const endpoint = (slug?: string) => slug ? `/api/v1/chatbot/publico/${encodeURIComponent(slug)}` : '/api/v1/chatbot'

export const chatbotApi = {
  suggestions: (slug?: string) => apiRequest<string[]>(`${endpoint(slug)}/sugerencias`, { skipAuth: !!slug }),
  ask: (pregunta: string, slug?: string) => apiRequest<ChatAnswer>(`${endpoint(slug)}/mensajes`, { method: 'POST', body: { pregunta }, skipAuth: !!slug, timeoutMs: 60_000 }),
  article: (id: string, slug?: string) => apiRequest<KnowledgeArticle>(slug
    ? `${endpoint(slug)}/articulos/${encodeURIComponent(id)}`
    : `/api/v1/chatbot/articulos/${encodeURIComponent(id)}`, { skipAuth: !!slug }),
  articles: () => apiRequest<KnowledgeArticle[]>('/api/v1/chatbot/articulos'),
  create: (body: ArticleInput) => apiRequest<KnowledgeArticle>('/api/v1/chatbot/articulos', { method: 'POST', body, timeoutMs: 120_000 }),
  update: (id: string, body: ArticleInput) => apiRequest<KnowledgeArticle>(`/api/v1/chatbot/articulos/${encodeURIComponent(id)}`, { method: 'PUT', body, timeoutMs: 120_000 }),
  remove: (id: string) => apiRequest<void>(`/api/v1/chatbot/articulos/${encodeURIComponent(id)}`, { method: 'DELETE' }),
}
