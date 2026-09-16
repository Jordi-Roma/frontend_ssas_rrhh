import { apiRequest, downloadFile } from '../../../shared/api/httpClient'

export type Respaldo = {
  id: string
  nombre: string
  formato: string
  tamano_bytes: number | null
  sha256: string | null
  estado: string
  creado_por_id: string
  fecha_creacion: string
  fecha_finalizacion: string | null
  fecha_restauracion: string | null
  restaurado_por_id: string | null
  mensaje_error: string | null
}

export type BackupOperation = { id: string; estado: string; mensaje: string }

export const respaldosApi = {
  list: () => apiRequest<Respaldo[]>('/api/v1/respaldos'),
  create: (nombre?: string) => apiRequest<BackupOperation>('/api/v1/respaldos', {
    method: 'POST', body: { nombre: nombre?.trim() || null },
  }),
  download: (id: string) => downloadFile(
    `/api/v1/respaldos/${encodeURIComponent(id)}/descargar`,
    `ssas-rrhh-${id}.tar.gz`,
  ),
  restore: (id: string, confirmacion: string) => apiRequest<BackupOperation>(
    `/api/v1/respaldos/${encodeURIComponent(id)}/restaurar`,
    { method: 'POST', body: { confirmacion } },
  ),
  remove: (id: string) => apiRequest<void>(
    `/api/v1/respaldos/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
  ),
}
