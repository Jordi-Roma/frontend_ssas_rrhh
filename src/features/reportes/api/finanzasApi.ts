import { apiRequest, buildQuery } from '../../../shared/api/httpClient'

export type FinancialReport = {
  moneda: string; desde: string; hasta: string
  ingresos: number; reembolsos: number; gastos: number; saldo_parcial: number; cobros: number
  meses: { mes: string; ingresos: number; reembolsos: number; gastos: number; saldo_parcial: number; cobros: number }[]
  costos_por_categoria: { categoria: string; monto: number }[]
  ventas_por_plan: { plan: string; monto: number }[]
  advertencias: string[]
}

export const finanzasApi = {
  summary: (desde: string, hasta: string, moneda: string) => apiRequest<FinancialReport>(
    `/api/v1/reportes/finanzas${buildQuery({ desde, hasta, moneda })}`,
  ),
  analysis: (desde: string, hasta: string, moneda: string) => apiRequest<{ texto: string; advertencia: string }>(
    `/api/v1/reportes/finanzas/analisis${buildQuery({ desde, hasta, moneda })}`, { timeoutMs: 25_000 },
  ),
  addExpense: (body: { fecha: string; categoria: string; monto: number; moneda: string; referencia: string; descripcion?: string }) =>
    apiRequest<{ id: string }>('/api/v1/reportes/finanzas/gastos', { method: 'POST', body }),
}
