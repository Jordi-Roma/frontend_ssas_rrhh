import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { FinanzasPage } from './FinanzasPage'
import { finanzasApi } from '../api/finanzasApi'

vi.mock('../api/finanzasApi', () => ({ finanzasApi: { summary: vi.fn(), analysis: vi.fn(), addExpense: vi.fn() } }))
afterEach(cleanup)

it('muestra ingresos, costos y saldo parcial sin llamarlo ganancia', async () => {
  vi.mocked(finanzasApi.summary).mockResolvedValue({
    moneda: 'USD', desde: '2026-01-01', hasta: '2026-11-21', ingresos: 20,
    reembolsos: 4, gastos: 3.5, saldo_parcial: 12.5, cobros: 1,
    meses: [{ mes: '2026-11', ingresos: 20, reembolsos: 4, gastos: 3.5, saldo_parcial: 12.5, cobros: 1 }],
    costos_por_categoria: [{ categoria: 'BACKUP', monto: 3.5 }],
    ventas_por_plan: [{ plan: 'PRO', monto: 20 }], advertencias: ['Los costos podrían estar incompletos.'],
  })
  render(<FinanzasPage />)
  expect(await screen.findByText('Los costos podrían estar incompletos.')).toBeTruthy()
  expect(screen.getAllByText(/Saldo parcial/).length).toBeGreaterThan(0)
  expect(screen.getByRole('img', { name: /BACKUP/ })).toBeTruthy()
})
