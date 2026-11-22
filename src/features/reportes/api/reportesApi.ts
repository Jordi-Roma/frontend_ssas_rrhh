import { apiRequest, buildQuery } from '../../../shared/api/httpClient'

export type Filter = { campo: string; operador: 'igual' | 'contiene' | 'mayor_igual' | 'menor_igual' | 'entre'; valor: unknown }
export type Order = { campo: string; direccion: 'asc' | 'desc' }
export type ReportConfig = { fuente: string; columnas: string[]; filtros: Filter[]; orden: Order[] }
export type Source = { codigo: string; nombre: string; columnas: string[] }
export type Preview = { columnas: string[]; items: Record<string, unknown>[]; total: number; page: number; per_page: number }
export type ChartSummary = { campo: string; metrica: string | null; total: number; total_valor: number; grupos: { label: string; count: number; value: number }[]; limite_meses: boolean }
export type Interpretation = { config: ReportConfig | null; aclaracion: string | null; grafico_campo?: string | null; grafico_metrica?: string | null; grafico_tipo?: 'bars' | 'donut' | 'line' | null }

const scope = (empresaId?: string) => buildQuery({ empresa_id: empresaId })

export const reportesApi = {
  catalog: () => apiRequest<Source[]>('/api/v1/reportes/catalogo'),
  interpret: (texto: string, empresaId?: string) =>
    apiRequest<Interpretation>(`/api/v1/reportes/interpretar${scope(empresaId)}`, {
      method: 'POST', body: { texto }, timeoutMs: 35_000,
    }),
  preview: (config: ReportConfig, empresaId?: string) =>
    apiRequest<Preview>(`/api/v1/reportes/vista-previa${scope(empresaId)}`, { method: 'POST', body: config }),
  chart: (config: ReportConfig, campo: string, metrica: string | null, empresaId?: string) =>
    apiRequest<ChartSummary>(`/api/v1/reportes/grafico${scope(empresaId)}`, { method: 'POST', body: { ...config, campo, metrica } }),
  create: (nombre: string, config: ReportConfig, empresaId?: string) =>
    apiRequest(`/api/v1/reportes${scope(empresaId)}`, { method: 'POST', body: { nombre, ...config } }),
  export: (format: 'xlsx' | 'html' | 'pdf' | 'csv', config: ReportConfig, empresaId?: string) =>
    apiRequest<Blob>(`/api/v1/reportes/exportar/${format}${scope(empresaId)}`, {
      method: 'POST', body: config, responseType: 'blob',
    }),
}

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url)
}
