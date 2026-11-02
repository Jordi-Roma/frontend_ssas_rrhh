import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { crearTasaLegal, getTasasLegales } from '../api/parametrosLegalesApi'
import { ParametrosLegalesPage } from './ParametrosLegalesPage'

vi.mock('../api/parametrosLegalesApi', () => ({
  getTasasLegales: vi.fn(), crearTasaLegal: vi.fn(), registrarSalarioMinimo: vi.fn(),
}))
afterEach(() => { cleanup(); vi.clearAllMocks() })

it('registra la tasa global con norma y vigencia', async () => {
  vi.mocked(getTasasLegales).mockResolvedValue([])
  vi.mocked(crearTasaLegal).mockResolvedValue({})
  const user = userEvent.setup()
  render(<ParametrosLegalesPage />)
  await screen.findByText('No hay vigencias registradas para este concepto.')
  await user.type(screen.getByLabelText('Porcentaje (%)'), '0.5')
  await user.type(screen.getByLabelText('Vigente desde'), '2026-10-01')
  await user.type(screen.getByLabelText('Vigente hasta'), '2026-12-31')
  await user.type(screen.getByLabelText('Norma legal'), 'Ley 065, artículos 87 y 94')
  await user.click(screen.getByRole('button', { name: 'Registrar vigencia' }))
  expect(crearTasaLegal).toHaveBeenCalledWith('SOLIDARIO_LABORAL_BO', {
    vigente_desde: '2026-10-01', vigente_hasta: '2026-12-31',
    porcentaje: 0.5, norma_legal: 'Ley 065, artículos 87 y 94',
  })
})

it('impide superponer una vigencia del mismo concepto', async () => {
  vi.mocked(getTasasLegales).mockResolvedValue([{
    id: 'tasa-1', codigo: 'SOLIDARIO_LABORAL_BO', vigente_desde: '2026-10-01',
    vigente_hasta: '2026-10-31', porcentaje: '0.50', monto: null, norma_legal: 'Ley 065',
  }])
  const user = userEvent.setup()
  render(<ParametrosLegalesPage />)
  await screen.findByText('2026-10-01')
  await user.type(screen.getByLabelText('Porcentaje (%)'), '0.5')
  await user.type(screen.getByLabelText('Vigente desde'), '2026-10-15')
  await user.type(screen.getByLabelText('Vigente hasta'), '2026-11-30')
  await user.type(screen.getByLabelText('Norma legal'), 'Ley 065, artículo 87')
  await user.click(screen.getByRole('button', { name: 'Registrar vigencia' }))
  expect(await screen.findByText(/se superpone con esas fechas/)).toBeInTheDocument()
  expect(crearTasaLegal).not.toHaveBeenCalled()
})
