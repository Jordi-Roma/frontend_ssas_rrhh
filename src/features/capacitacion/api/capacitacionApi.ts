import { apiRequest, buildQuery } from '../../../shared/api/httpClient'

export type Curso = {
  id: string; titulo: string; descripcion: string | null; categoria: string | null
  duracion_horas: number | null; es_obligatorio: boolean; imagen_url: string | null
  instructor: string | null; nota_minima: number; estado: 'BORRADOR' | 'PUBLICADO'
}
export type CursoInput = Pick<Curso, 'titulo' | 'descripcion' | 'categoria' | 'duracion_horas' | 'es_obligatorio' | 'imagen_url' | 'instructor' | 'nota_minima'>
export type LeccionTipo = 'VIDEO' | 'DOCUMENTO' | 'MANUAL' | 'QUIZ' | 'ENLACE'
export type Leccion = {
  id: string; curso_id: string; titulo: string; tipo: LeccionTipo; orden: number
  duracion_minutos: number | null; contenido_url: string | null; contenido_texto: string | null
}
export type LeccionInput = Pick<Leccion, 'titulo' | 'tipo' | 'orden' | 'duracion_minutos' | 'contenido_url' | 'contenido_texto'>
export type Inscripcion = {
  id: string; curso_id: string; empleado_id: string; progreso: number
  calificacion: number | null; estado: string; aprobado: boolean
  fecha_limite: string | null; inscrito_en: string
}
export type Asignacion = { curso_id: string; empleado_id?: string; departamento_id?: string; fecha_limite?: string | null }
const scoped = (empresaId: string | null) => buildQuery({ empresa_id: empresaId })

export const capacitacionApi = {
  cursos: (empresaId: string | null) => apiRequest<Curso[]>(`/api/v1/capacitacion/cursos${scoped(empresaId)}`),
  crearCurso: (body: CursoInput, empresaId: string | null) => apiRequest<Curso>(`/api/v1/capacitacion/cursos${scoped(empresaId)}`, { method: 'POST', body }),
  editarCurso: (id: string, body: CursoInput, empresaId: string | null) => apiRequest<Curso>(`/api/v1/capacitacion/cursos/${encodeURIComponent(id)}${scoped(empresaId)}`, { method: 'PATCH', body }),
  publicarCurso: (id: string, empresaId: string | null) => apiRequest<Curso>(`/api/v1/capacitacion/cursos/${encodeURIComponent(id)}/publicar${scoped(empresaId)}`, { method: 'POST' }),
  borrarCurso: (id: string, empresaId: string | null) => apiRequest<void>(`/api/v1/capacitacion/cursos/${encodeURIComponent(id)}${scoped(empresaId)}`, { method: 'DELETE' }),
  lecciones: (id: string, empresaId: string | null) => apiRequest<Leccion[]>(`/api/v1/capacitacion/cursos/${encodeURIComponent(id)}/lecciones${scoped(empresaId)}`),
  crearLeccion: (id: string, body: LeccionInput, empresaId: string | null) => apiRequest<Leccion>(`/api/v1/capacitacion/cursos/${encodeURIComponent(id)}/lecciones${scoped(empresaId)}`, { method: 'POST', body }),
  editarLeccion: (id: string, body: LeccionInput, empresaId: string | null) => apiRequest<Leccion>(`/api/v1/capacitacion/lecciones/${encodeURIComponent(id)}${scoped(empresaId)}`, { method: 'PATCH', body }),
  borrarLeccion: (id: string, empresaId: string | null) => apiRequest<void>(`/api/v1/capacitacion/lecciones/${encodeURIComponent(id)}${scoped(empresaId)}`, { method: 'DELETE' }),
  subirMaterial: (archivo: File, empresaId: string | null) => {
    const formData = new FormData(); formData.append('archivo', archivo)
    return apiRequest<{ contenido_url: string }>(`/api/v1/capacitacion/materiales${scoped(empresaId)}`, { method: 'POST', formData, timeoutMs: 90_000 })
  },
  inscripciones: (cursoId: string, empresaId: string | null) => apiRequest<Inscripcion[]>(`/api/v1/capacitacion/inscripciones${buildQuery({ curso_id: cursoId, empresa_id: empresaId })}`),
  asignar: (body: Asignacion, empresaId: string | null) => apiRequest<{ inscripciones: Inscripcion[]; cantidad: number }>(`/api/v1/capacitacion/inscripciones${scoped(empresaId)}`, { method: 'POST', body }),
  calificar: (id: string, calificacion: number, empresaId: string | null) => apiRequest<Inscripcion>(`/api/v1/capacitacion/inscripciones/${encodeURIComponent(id)}/calificar${scoped(empresaId)}`, { method: 'POST', body: { calificacion } }),
}
