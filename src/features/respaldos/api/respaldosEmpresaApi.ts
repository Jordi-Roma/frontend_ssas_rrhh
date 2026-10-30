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
  retencion_dias: number
  servicio_habilitado: boolean
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
  config: (empresaId: string) =>
    apiRequest<ConfigRespaldosEmpresa>(`${ROOT}/configuracion/${encodeURIComponent(empresaId)}`),
  updateConfig: (empresaId: string, autoHabilitado: boolean) =>
    apiRequest<ConfigRespaldosEmpresa>(`${ROOT}/configuracion/${encodeURIComponent(empresaId)}`, {
      method: 'PATCH', body: { auto_habilitado: autoHabilitado },
    }),
}
