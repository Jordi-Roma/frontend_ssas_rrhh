import { apiRequest, buildQuery } from '../../../shared/api/httpClient'

export type Filter = { campo: string; operador: 'igual' | 'contiene' | 'mayor_igual' | 'menor_igual' | 'entre'; valor: unknown }
export type Order = { campo: string; direccion: 'asc' | 'desc' }
export type ReportConfig = { fuente: string; columnas: string[]; filtros: Filter[]; orden: Order[] }
export type Source = { codigo: string; nombre: string; columnas: string[] }
export type Preview = { columnas: string[]; items: Record<string, unknown>[]; total: number; page: number; per_page: number }

const scope = (empresaId?: string) => buildQuery({ empresa_id: empresaId })

export const reportesApi = {
  catalog: () => apiRequest<Source[]>('/api/v1/reportes/catalogo'),
  preview: (config: ReportConfig, empresaId?: string) =>
    apiRequest<Preview>(`/api/v1/reportes/vista-previa${scope(empresaId)}`, { method: 'POST', body: config }),
  create: (nombre: string, config: ReportConfig, empresaId?: string) =>
    apiRequest(`/api/v1/reportes${scope(empresaId)}`, { method: 'POST', body: { nombre, ...config } }),
  export: (format: 'xlsx' | 'html' | 'pdf', config: ReportConfig, empresaId?: string) =>
    apiRequest<Blob>(`/api/v1/reportes/exportar/${format}${scope(empresaId)}`, {
      method: 'POST', body: config, responseType: 'blob',
    }),
}

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url)
}
