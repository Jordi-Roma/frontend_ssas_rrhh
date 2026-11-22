import { apiRequest } from '../../../shared/api/httpClient'
import type { components } from '../../../shared/api/schema'

type VacanteResponse = components['schemas']['VacanteResponse']
type CrearVacanteRequest = components['schemas']['CrearVacanteRequest']
type ActualizarVacanteRequest = components['schemas']['ActualizarVacanteRequest']
type CargoResponse = components['schemas']['CargoResponse']
type DepartamentoResponse = components['schemas']['DepartamentoResponse']

export type ModalidadVacante = 'PRESENCIAL' | 'HIBRIDO' | 'REMOTO'

export const MODALIDADES: ModalidadVacante[] = ['PRESENCIAL', 'HIBRIDO', 'REMOTO']

export type EstadoVacante = 'BORRADOR' | 'PUBLICADA' | 'PAUSADA' | 'CERRADA' | 'CANCELADA'

export type CargoOpcion = {
  id: string
  nombre: string
  departamento_id: string | null
  departamento_nombre: string
}

export type DepartamentoOpcion = {
  id: string
  nombre: string
}

export type VacanteHabilidad = {
  habilidad_id: string
  nombre: string
  nivel_requerido: string
  es_obligatorio: boolean
  peso: number
}

export type Vacante = {
  id: string
  titulo: string
  cargo_id: string
  departamento_id: string
  descripcion: string
  requisitos: string
  beneficios: string
  cantidad_vacantes: number
  salario_min: number | null
  salario_max: number | null
  mostrar_salario: boolean
  modalidad: ModalidadVacante
  ubicacion: string
  experiencia_min: number
  fecha_cierre: string
  estado: EstadoVacante
  cargo_nombre?: string | null
  departamento_nombre?: string | null
  habilidades?: VacanteHabilidad[]
}

export type VacanteListItem = Vacante & {
  cargo_nombre: string
  departamento_nombre: string
  postulantes_count: number | null
}

export type CandidatoInterno = { empleado_id: string; nombre: string; codigo: string; afinidad: number; coinciden: string[]; faltan: string[]; obligatorias_pendientes: string[] }
export type SugerenciasInternas = { vacante_id: string; evaluables: boolean; candidatos: CandidatoInterno[] }

export function getCandidatosInternos(id: string, empresaId?: string) {
  return apiRequest<SugerenciasInternas>(scopedPath(`/api/v1/vacantes/${encodeURIComponent(id)}/candidatos-internos`, empresaId))
}

export type VacanteFormData = CrearVacanteRequest

export type VacantesFilters = {
  estado?: EstadoVacante | 'TODAS'
  departamento_id?: string | 'TODOS'
  busqueda?: string
  page?: number
  per_page?: number
  empresa_id?: string
}

export type PaginatedVacantes = {
  items: VacanteListItem[]
  departamentos: DepartamentoOpcion[]
  total: number
  all_total: number
  counts: Record<EstadoVacante, number>
  page: number
  per_page: number
  total_pages: number
}

function scopedPath(path: string, empresaId?: string) {
  return empresaId ? `${path}?empresa_id=${encodeURIComponent(empresaId)}` : path
}

function toVacante(item: VacanteResponse): Vacante {
  return {
    id: item.id,
    titulo: item.titulo,
    cargo_id: item.cargo_id,
    departamento_id: item.departamento_id,
    descripcion: item.descripcion,
    requisitos: item.requisitos ?? '',
    beneficios: item.beneficios ?? '',
    cantidad_vacantes: item.cantidad_vacantes,
    salario_min: item.salario_min == null ? null : Number(item.salario_min),
    salario_max: item.salario_max == null ? null : Number(item.salario_max),
    mostrar_salario: item.mostrar_salario,
    modalidad: item.modalidad as ModalidadVacante,
    ubicacion: item.ubicacion ?? '',
    experiencia_min: item.experiencia_min,
    fecha_cierre: item.fecha_cierre ?? '',
    estado: item.estado as EstadoVacante,
    cargo_nombre: item.cargo_nombre,
    departamento_nombre: item.departamento_nombre,
    habilidades: (item.habilidades || []).map((h) => ({
      habilidad_id: h.habilidad_id,
      nombre: h.nombre,
      nivel_requerido: h.nivel_requerido,
      es_obligatorio: h.es_obligatorio,
      peso: Number(h.peso),
    })),
  }
}

export async function getCargosOpcion(empresaId?: string): Promise<CargoOpcion[]> {
  const [cargos, departamentos] = await Promise.all([
    apiRequest<CargoResponse[]>(scopedPath('/api/v1/cargos', empresaId)),
    apiRequest<DepartamentoResponse[]>(scopedPath('/api/v1/departamentos', empresaId)),
  ])
  const nombres = new Map(departamentos.map((item) => [item.id, item.nombre]))
  return cargos.map((item) => ({
    id: item.id,
    nombre: item.nombre,
    departamento_id: item.departamento_id,
    departamento_nombre: item.departamento_id
      ? (nombres.get(item.departamento_id) ?? 'Departamento no disponible')
      : 'Sin departamento',
  }))
}

export async function getDepartamentosOpcion(empresaId?: string): Promise<DepartamentoOpcion[]> {
  const departamentos = await apiRequest<DepartamentoResponse[]>(
    scopedPath('/api/v1/departamentos', empresaId),
  )
  return departamentos.map(({ id, nombre }) => ({ id, nombre }))
}

export async function getVacante(id: string, empresaId?: string): Promise<Vacante> {
  const item = await apiRequest<VacanteResponse>(
    scopedPath(`/api/v1/vacantes/${encodeURIComponent(id)}`, empresaId),
  )
  return toVacante(item)
}

export async function getVacantes(filters: VacantesFilters = {}): Promise<PaginatedVacantes> {
  const {
    estado = 'TODAS',
    departamento_id = 'TODOS',
    busqueda = '',
    page = 1,
    per_page = 10,
    empresa_id,
  } = filters

  const rawVacantes = await apiRequest<VacanteResponse[]>(
    scopedPath('/api/v1/vacantes', empresa_id),
  )

  const allItems: VacanteListItem[] = rawVacantes.map((item) => ({
    ...toVacante(item),
    cargo_nombre: item.cargo_nombre ?? 'Cargo no disponible',
    departamento_nombre: item.departamento_nombre ?? 'Departamento no disponible',
    postulantes_count: null,
  }))
  const departamentos = Array.from(
    new Map(
      allItems.map((item) => [
        item.departamento_id,
        { id: item.departamento_id, nombre: item.departamento_nombre },
      ]),
    ).values(),
  ).sort((left, right) => left.nombre.localeCompare(right.nombre, 'es'))

  const counts: Record<EstadoVacante, number> = {
    BORRADOR: 0,
    PUBLICADA: 0,
    PAUSADA: 0,
    CERRADA: 0,
    CANCELADA: 0,
  }
  allItems.forEach((item) => {
    if (item.estado in counts) counts[item.estado] += 1
  })

  let list = allItems
  if (estado !== 'TODAS') list = list.filter((item) => item.estado === estado)
  if (departamento_id !== 'TODOS') list = list.filter((item) => item.departamento_id === departamento_id)
  if (busqueda.trim()) {
    const query = busqueda.trim().toLowerCase()
    list = list.filter((item) =>
      [item.titulo, item.cargo_nombre, item.departamento_nombre, item.ubicacion, item.descripcion]
        .some((value) => value.toLowerCase().includes(query)),
    )
  }

  const total = list.length
  const total_pages = Math.max(1, Math.ceil(total / per_page))
  const safePage = Math.min(Math.max(1, page), total_pages)
  const startIndex = (safePage - 1) * per_page

  return {
    items: list.slice(startIndex, startIndex + per_page),
    departamentos,
    total,
    all_total: allItems.length,
    counts,
    page: safePage,
    per_page,
    total_pages,
  }
}

export async function crearVacante(data: VacanteFormData, empresaId?: string): Promise<Vacante> {
  const item = await apiRequest<VacanteResponse>(scopedPath('/api/v1/vacantes', empresaId), {
    method: 'POST',
    body: data,
  })
  return toVacante(item)
}

export async function actualizarVacante(
  id: string,
  data: ActualizarVacanteRequest,
  empresaId?: string,
): Promise<Vacante> {
  const item = await apiRequest<VacanteResponse>(
    scopedPath(`/api/v1/vacantes/${encodeURIComponent(id)}`, empresaId),
    { method: 'PUT', body: data },
  )
  return toVacante(item)
}

export async function publicarVacante(id: string, empresaId?: string): Promise<Vacante> {
  const item = await apiRequest<VacanteResponse>(
    scopedPath(`/api/v1/vacantes/${encodeURIComponent(id)}/publicar`, empresaId),
    { method: 'PATCH' },
  )
  return toVacante(item)
}

export async function reanudarVacante(id: string, empresaId?: string): Promise<Vacante> {
  const item = await apiRequest<VacanteResponse>(
    scopedPath(`/api/v1/vacantes/${encodeURIComponent(id)}/reanudar`, empresaId),
    { method: 'PATCH' },
  )
  return toVacante(item)
}

export async function pausarVacante(id: string, empresaId?: string): Promise<Vacante> {
  const item = await apiRequest<VacanteResponse>(
    scopedPath(`/api/v1/vacantes/${encodeURIComponent(id)}/pausar`, empresaId),
    { method: 'PATCH' },
  )
  return toVacante(item)
}

export async function cerrarVacante(id: string, empresaId?: string): Promise<Vacante> {
  const item = await apiRequest<VacanteResponse>(
    scopedPath(`/api/v1/vacantes/${encodeURIComponent(id)}/cerrar`, empresaId),
    { method: 'PATCH' },
  )
  return toVacante(item)
}

export function eliminarVacante(id: string, empresaId?: string) {
  return apiRequest<void>(
    scopedPath(`/api/v1/vacantes/${encodeURIComponent(id)}`, empresaId),
    { method: 'DELETE' },
  )
}
