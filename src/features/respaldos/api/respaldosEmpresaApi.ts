import { apiRequest, buildQuery, downloadFile } from '../../../shared/api/httpClient'

export type RespaldoEmpresa = {
  id: string
  empresa_id: string
  origen: 'MANUAL' | 'AUTO'
  estado: string
  fecha_creacion: string
  fecha_inicio: string | null
  fecha_finalizacion: string | null
  tamano_bytes: number | null
  sha256: string | null
  mensaje_error: string | null
}

export type UltimosRespaldos = {
  ultimo_intento: RespaldoEmpresa | null
  ultimo_exitoso: RespaldoEmpresa | null
}

export type ConfigRespaldosEmpresa = {
  empresa_id: string
  auto_habilitado: boolean
  hora_local: string
  zona_horaria: string
  hora_configurable: boolean
  retencion_dias: number
  servicio_habilitado: boolean
}

export type RestauracionPreview = {
  empresa_id: string
  respaldo_id: string
  sha256: string
  fecha_copia: string
  tablas: Record<string, number>
  archivos: number
  restauracion_habilitada: boolean
}

const ROOT = '/api/v1/respaldos-empresa'

export const respaldosEmpresaApi = {
  list: (empresaId?: string, offset = 0, limit = 25) =>
    apiRequest<RespaldoEmpresa[]>(`${ROOT}${buildQuery({ empresa_id: empresaId, offset, limit })}`),
  latest: (empresaId?: string) =>
    apiRequest<UltimosRespaldos>(`${ROOT}/ultimo${buildQuery({ empresa_id: empresaId })}`),
  create: (empresaId?: string) =>
    apiRequest<RespaldoEmpresa>(ROOT, { method: 'POST', body: { empresa_id: empresaId ?? null } }),
  download: (id: string) =>
    downloadFile(`${ROOT}/${encodeURIComponent(id)}/descargar`, `ssas-empresa-${id}.tar.gz`),
  restorePreview: (id: string) =>
    apiRequest<RestauracionPreview>(`${ROOT}/${encodeURIComponent(id)}/restauracion/preview`),
  restore: (id: string, preview: RestauracionPreview, confirmacion: string) =>
    apiRequest<{ empresa_id: string; respaldo_id: string; respaldo_previo_id: string }>(
      `${ROOT}/${encodeURIComponent(id)}/restaurar`, {
        method: 'POST',
        body: { empresa_id: preview.empresa_id, sha256: preview.sha256, confirmacion },
      }),
  config: (empresaId: string) =>
    apiRequest<ConfigRespaldosEmpresa>(`${ROOT}/configuracion/${encodeURIComponent(empresaId)}`),
  updateConfig: (empresaId: string, changes: { auto_habilitado?: boolean; hora_local?: string }) =>
    apiRequest<ConfigRespaldosEmpresa>(`${ROOT}/configuracion/${encodeURIComponent(empresaId)}`, {
      method: 'PATCH', body: changes,
    }),
}
