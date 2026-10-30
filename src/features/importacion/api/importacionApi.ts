import { apiRequest, buildQuery, downloadFile } from '../../../shared/api/httpClient'

export type TipoCatalogo = 'departamentos' | 'cargos' | 'habilidades' | 'etapas' | 'motivos_rechazo' | 'usuarios' | 'empleados'
export type FilaImportacion = { fila: number; datos: Record<string, string>; accion: 'crear' | 'omitir' | 'error'; errores: string[] }
export type VistaImportacion = { sha256: string; filas: FilaImportacion[]; crear: number; omitir: number; errores: number }

function path(tipo: TipoCatalogo, action: string, empresaId?: string) {
  return `/api/v1/importaciones/${tipo}/${action}${buildQuery({ empresa_id: empresaId })}`
}

export const importacionApi = {
  plantilla: (tipo: TipoCatalogo, formato: 'csv' | 'xlsx', empresaId?: string) => downloadFile(`${path(tipo, 'plantilla', empresaId)}${empresaId ? '&' : '?'}formato=${formato}`, `${tipo}.${formato}`),
  preview: (tipo: TipoCatalogo, file: File, empresaId?: string) => {
    const formData = new FormData(); formData.append('archivo', file)
    return apiRequest<VistaImportacion>(path(tipo, 'previsualizar', empresaId), { method: 'POST', formData, timeoutMs: 60_000 })
  },
  confirm: (tipo: TipoCatalogo, file: File, sha256: string, empresaId?: string) => {
    const formData = new FormData(); formData.append('archivo', file); formData.append('sha256', sha256)
    return apiRequest<VistaImportacion>(path(tipo, 'confirmar', empresaId), { method: 'POST', formData, timeoutMs: 120_000 })
  },
}
