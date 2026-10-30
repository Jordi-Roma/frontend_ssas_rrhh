import { apiRequest, buildQuery } from '../../../shared/api/httpClient'

export type SolicitudAusencia = {
  id: string
  empleado_id: string
  tipo_ausencia: string
  fecha_inicio: string
  fecha_fin: string
  estado: string
  observacion?: string | null
  dias_habiles_vacacion?: number | null
}

export function getAusenciasEquipo(empresaId?: string | null) {
  return apiRequest<SolicitudAusencia[]>(
    `/api/v1/personal/mi/equipo/ausencias${buildQuery({ empresa_id: empresaId })}`,
  )
}

export function decidirAusencia(
  solicitudId: string,
  decision: 'APROBAR' | 'RECHAZAR',
  observacion: string,
  diasHabiles?: number,
  empresaId?: string | null,
) {
  return apiRequest(
    `/api/v1/personal/ausencias/${encodeURIComponent(solicitudId)}/decision${buildQuery({ empresa_id: empresaId })}`,
    {
      method: 'POST',
      body: {
        decision,
        observacion,
        dias_habiles_vacacion: diasHabiles,
      },
    },
  )
}