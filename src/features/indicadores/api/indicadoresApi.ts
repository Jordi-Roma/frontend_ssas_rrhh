import { apiRequest, buildQuery } from '../../../shared/api/httpClient'

export type Indicadores = {
  empresa_id: string; desde: string; hasta: string
  rotacion: { porcentaje: number; salidas: number; ingresos: number; dotacion_inicial: number; dotacion_final: number }
  ausentismo: { porcentaje: number; dias_habiles_ausentes: number; dias_solicitados: number; dias_habiles_posibles: number }
  tiempo_promedio_contratacion: { dias: number | null; contrataciones_medir: number }
  headcount_por_departamento: { departamento_id: string; departamento: string; empleados: number }[]
  embudo_reclutamiento: Record<string, number>
  embudo_por_etapa: { etapa_id: string; etapa: string; orden: number; postulaciones: number }[]
}
export const indicadoresApi = {
  obtener: (empresaId: string, desde: string, hasta: string) => apiRequest<Indicadores>(`/api/v1/indicadores${buildQuery({ empresa_id: empresaId, desde, hasta })}`),
}
