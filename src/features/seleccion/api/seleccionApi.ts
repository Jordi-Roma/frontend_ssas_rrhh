import { apiRequest, buildQuery } from '../../../shared/api/httpClient'
import { normalizeEntrevista, type Entrevista } from '../../entrevistas/api/entrevistasApi'

export type Evaluacion = { id: string; postulacion_id: string; evaluador_id: string; evaluador_nombre?: string; tipo: string; nombre: string; puntaje: number; puntaje_maximo: number; aprobado: boolean | null; archivo_url: string | null; observaciones: string | null; fecha: string }
export type EvaluacionPayload = Pick<Evaluacion, 'tipo' | 'nombre' | 'puntaje' | 'puntaje_maximo' | 'aprobado' | 'observaciones'> & { evaluador_id?: string }
export type EvaluadorOpcion = { id: string; nombre: string; rol: string }
export type AnalisisCV = { id: string; postulacion_id: string; puntaje_afinidad: number; habilidades_detectadas: string[]; habilidades_faltantes: string[]; anios_experiencia_detectados: number | null; resumen_ia: string; fortalezas: string[]; observaciones: string | null; modelo_usado: string; tiempo_proceso_ms: number; fecha_analisis: string }
export type RankingCandidato = { id: string; postulante_id: string; nombre_postulante: string; estado: string; puntaje_ia: number | null; puntaje_manual: number | null; puntaje_entrevistas: number | null; puntaje_evaluaciones: number | null; experiencia_anios: number; educacion: string; habilidades_detectadas: string[]; habilidades_faltantes: string[]; entrevistas: Entrevista[]; evaluaciones: Evaluacion[] }
export type VacanteSeleccion = { id: string; titulo: string; habilidades: string[] }
export function seleccionPath(path: string, empresaId?: string, params: Record<string, string | number | undefined> = {}) { return `/api/v1/${path}${buildQuery({ ...params, empresa_id: empresaId })}` }
export function getVacantesSeleccion(empresaId?: string) { return apiRequest<VacanteSeleccion[]>(seleccionPath('seleccion/vacantes', empresaId)) }
export function getEvaluadores(empresaId?: string) { return apiRequest<EvaluadorOpcion[]>(seleccionPath('evaluaciones/opciones', empresaId)) }
export async function getRanking(vacanteId: string, empresaId: string | undefined, filters: { page: number; per_page: number; busqueda?: string; estado?: string; orden?: string }) {
  const { page, per_page, busqueda, estado, orden } = filters
  const path = `vacantes/${encodeURIComponent(vacanteId)}/ranking`
  if (!busqueda?.trim()) return apiRequest<{ items: RankingCandidato[]; total: number }>(seleccionPath(path, empresaId, { offset: (page - 1) * per_page, limit: per_page, estado, orden }))
  const candidates: RankingCandidato[] = []
  let offset = 0, total = 1
  while (offset < total) {
    const batch = await apiRequest<{ items: RankingCandidato[]; total: number }>(seleccionPath(path, empresaId, { offset, limit: 100, estado, orden }))
    candidates.push(...batch.items); total = batch.total
    if (!batch.items.length) break
    offset += batch.items.length
  }
  const matching = candidates.filter(c => c.nombre_postulante.toLocaleLowerCase().includes(busqueda.trim().toLocaleLowerCase()))
  return { items: matching.slice((page - 1) * per_page, page * per_page), total: matching.length }
}
export function compararCandidatos(vacanteId: string, ids: string[], empresaId?: string) {
  if (ids.length < 2 || ids.length > 4 || new Set(ids).size !== ids.length) return Promise.reject(new Error('Selecciona entre dos y cuatro postulaciones distintas.'))
  return apiRequest<RankingCandidato[]>(seleccionPath(`vacantes/${encodeURIComponent(vacanteId)}/comparar`, empresaId), { method: 'POST', body: { postulacion_ids: ids } })
}
export function normalizeAnalisis(a: AnalisisCV): AnalisisCV { return { ...a, puntaje_afinidad: Number(a.puntaje_afinidad), anios_experiencia_detectados: a.anios_experiencia_detectados == null ? null : Number(a.anios_experiencia_detectados) } }
export function normalizeEvaluacion(e: Evaluacion): Evaluacion { return { ...e, puntaje: Number(e.puntaje), puntaje_maximo: Number(e.puntaje_maximo) } }
export function getAnalisis(id: string, empresaId?: string) { return apiRequest<AnalisisCV[]>(seleccionPath(`postulaciones/${encodeURIComponent(id)}/analisis-cv`, empresaId)).then(items => items.map(normalizeAnalisis)) }
export function analizarCV(id: string, empresaId?: string) { return apiRequest<AnalisisCV>(seleccionPath(`postulaciones/${encodeURIComponent(id)}/analisis-cv`, empresaId), { method: 'POST', timeoutMs: 100_000 }).then(normalizeAnalisis) }
export function getEvaluaciones(id: string, empresaId?: string) { return apiRequest<Evaluacion[]>(seleccionPath(`postulaciones/${encodeURIComponent(id)}/evaluaciones`, empresaId)).then(items => items.map(normalizeEvaluacion)) }
export function guardarEvaluacion(id: string, data: EvaluacionPayload, empresaId?: string, evaluacionId?: string) {
  return apiRequest<Evaluacion>(seleccionPath(evaluacionId ? `evaluaciones/${encodeURIComponent(evaluacionId)}` : `postulaciones/${encodeURIComponent(id)}/evaluaciones`, empresaId), { method: evaluacionId ? 'PATCH' : 'POST', body: data }).then(normalizeEvaluacion)
}
export function getEntrevistasCandidato(id: string, empresaId?: string) { return apiRequest<Entrevista[]>(seleccionPath(`postulaciones/${encodeURIComponent(id)}/entrevistas`, empresaId)).then(items => items.map(normalizeEntrevista)) }
