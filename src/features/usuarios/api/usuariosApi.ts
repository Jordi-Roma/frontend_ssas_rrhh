import { apiRequest, buildQuery } from '../../../shared/api/httpClient'
import type { components } from '../../../shared/api/schema'

type CreateUser = components['schemas']['CrearUsuarioRequest']
type UpdateUser = components['schemas']['ActualizarUsuarioRequest']
type User = components['schemas']['UsuarioResponse']
type UserPage = components['schemas']['UsuarioPageResponse']
export type FichaEmpleadoVinculo =
  | { empleado_id: string }
  | { nueva_ficha: { codigo: string; nombres: string; apellido_paterno: string; apellido_materno?: string | null; ci: string; ci_expedido: string; fecha_ingreso: string } }

export type UsuariosQuery = {
  empresa_id?: string
  search?: string
  is_active?: boolean
  incluir_eliminados?: boolean
  page?: number
  per_page?: number
}

/** `empresa_id` viaja como query en todas las operaciones sobre un usuario concreto:
 *  el backend lo exige para que un administrador de plataforma indique el alcance. */
function scoped(path: string, empresaId?: string): string {
  return `${path}${buildQuery({ empresa_id: empresaId })}`
}

export const usuariosApi = {
  list: (query: UsuariosQuery = {}) =>
    apiRequest<UserPage>(
      `/api/v1/usuarios${buildQuery({
        empresa_id: query.empresa_id,
        search: query.search,
        is_active: query.is_active,
        incluir_eliminados: query.incluir_eliminados,
        page: query.page ?? 1,
        per_page: query.per_page ?? 25,
      })}`,
    ),

  get: (id: string, empresaId?: string) => apiRequest<User>(scoped(`/api/v1/usuarios/${id}`, empresaId)),
  getEmployeeLink: (id: string, empresaId?: string) =>
    apiRequest<{ empleado_id: string | null }>(scoped(`/api/v1/usuarios/${id}/ficha-empleado`, empresaId)),

  /** `empresa_id` va en el CUERPO. Ausente significa administrador de plataforma. */
  create: (data: CreateUser & { ficha_empleado?: FichaEmpleadoVinculo }) => apiRequest<User>('/api/v1/usuarios', { method: 'POST', body: data }),

  update: (id: string, data: UpdateUser & { ficha_empleado?: FichaEmpleadoVinculo }, empresaId?: string) =>
    apiRequest<User>(scoped(`/api/v1/usuarios/${id}`, empresaId), { method: 'PATCH', body: data }),

  activate: (id: string, empresaId?: string) =>
    apiRequest<User>(scoped(`/api/v1/usuarios/${id}/activar`, empresaId), { method: 'PATCH' }),

  deactivate: (id: string, empresaId?: string) =>
    apiRequest<User>(scoped(`/api/v1/usuarios/${id}/desactivar`, empresaId), { method: 'PATCH' }),

  unlock: (id: string, empresaId?: string) =>
    apiRequest<User>(scoped(`/api/v1/usuarios/${id}/desbloquear`, empresaId), { method: 'PATCH' }),

  remove: (id: string, empresaId?: string) =>
    apiRequest<void>(scoped(`/api/v1/usuarios/${id}`, empresaId), { method: 'DELETE' }),

  restore: (id: string, empresaId?: string) =>
    apiRequest<User>(scoped(`/api/v1/usuarios/${id}/restaurar`, empresaId), { method: 'PATCH' }),

  changePassword: (
    id: string,
    data: components['schemas']['CambiarPasswordUsuarioRequest'],
    empresaId?: string,
  ) =>
    apiRequest<User>(scoped(`/api/v1/usuarios/${id}/password`, empresaId), {
      method: 'PUT',
      body: data,
    }),
}
