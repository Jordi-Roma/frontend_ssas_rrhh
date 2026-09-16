import { apiRequest, buildQuery } from '../../../shared/api/httpClient'

export type Plan = { id: string; nombre: string; descripcion: string | null; precio_mensual: string; moneda: string; max_usuarios: number; max_vacantes_activas: number; max_almacenamiento_mb: number; stripe_price_id: string | null; modulos: string[]; activo: boolean }
export type Subscription = { id: string; empresa_id: string; plan: Plan; estado: string; fecha_inicio: string; fecha_fin: string | null; periodo_prueba_hasta: string | null; cancelar_al_fin_periodo: boolean; fecha_ultimo_pago: string | null; fecha_proximo_cobro: string | null; stripe_customer_id: string | null; stripe_subscription_id: string | null }
export type Consumption = { estado: string; usuarios: Usage; vacantes_activas: Usage; almacenamiento_mb: Usage }
export type Usage = { usado: number; limite: number }
export type PlanInput = Omit<Plan, 'id'>

export const suscripcionesApi = {
  plans: (includeInactive = false) => apiRequest<Plan[]>(`/api/v1/planes${buildQuery({ include_inactive: includeInactive })}`),
  createPlan: (body: PlanInput) => apiRequest<Plan>('/api/v1/planes', { method: 'POST', body }),
  updatePlan: (id: string, body: PlanInput) => apiRequest<Plan>(`/api/v1/planes/${id}`, { method: 'PUT', body }),
  current: (empresaId?: string) => apiRequest<Subscription>(`/api/v1/suscripcion${buildQuery({ empresa_id: empresaId })}`),
  consumption: () => apiRequest<Consumption>('/api/v1/suscripcion/consumo'),
  assign: (empresaId: string, planId: string, estado = 'ACTIVA') => apiRequest<Subscription>(`/api/v1/suscripcion/empresas/${empresaId}`, { method: 'PUT', body: { plan_id: planId, estado } }),
  checkout: (planId: string) => apiRequest<{ url: string }>('/api/v1/suscripcion/checkout', { method: 'POST', body: { plan_id: planId } }),
  portal: () => apiRequest<{ url: string }>('/api/v1/suscripcion/portal', { method: 'POST' }),
}
