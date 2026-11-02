import { apiRequest, buildQuery, downloadFile } from '../../../shared/api/httpClient'

export type Documento = {
  id: string
  tipo: string
  nombre: string
  fecha_carga: string
  tamano_bytes: number
}

export function getDocumentos(empleadoId: string, empresaId?: string | null) {
  return apiRequest<Documento[]>(
    `/api/v1/personal/empleados/${encodeURIComponent(empleadoId)}/documentos${buildQuery({ empresa_id: empresaId })}`,
  )
}

export function subirDocumento(empleadoId: string, file: File, tipo: string, empresaId?: string | null) {
  const form = new FormData()
  form.append('archivo', file)
  return apiRequest(
    `/api/v1/personal/empleados/${encodeURIComponent(empleadoId)}/documentos${buildQuery({ empresa_id: empresaId, tipo })}`,
    { method: 'POST', formData: form },
  )
}

export function descargarDocumento(empleadoId: string, documento: Documento, empresaId?: string | null) {
  return downloadFile(
    `/api/v1/personal/empleados/${encodeURIComponent(empleadoId)}/documentos/${encodeURIComponent(documento.id)}/descarga${buildQuery({ empresa_id: empresaId })}`,
    documento.nombre,
  )
}
