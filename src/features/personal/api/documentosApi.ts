import { apiRequest, buildQuery } from '../../../shared/api/httpClient'

export type Documento = {
  id: string
  tipo: string
  nombre_archivo: string
  fecha_registro: string
  url?: string | null
}

export function getDocumentos(empleadoId: string, empresaId?: string | null) {
  return apiRequest<Documento[]>(
    `/api/v1/personal/empleados/${encodeURIComponent(empleadoId)}/documentos${buildQuery({ empresa_id: empresaId })}`,
  )
}

export function subirDocumento(empleadoId: string, file: File, tipo: string, empresaId?: string | null) {
  const form = new FormData()
  form.append('archivo', file)
  form.append('tipo', tipo)
  return apiRequest(
    `/api/v1/personal/empleados/${encodeURIComponent(empleadoId)}/documentos${buildQuery({ empresa_id: empresaId })}`,
    { method: 'POST', body: form },
  )
}