import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { abrirPeriodo, getPeriodos } from '../api/periodosApi'
import { PeriodosNominaPage } from './PeriodosNominaPage'

vi.mock('../../../app/context/CompanyScopeContext', () => ({ useCompanyScope: () => ({ selectedCompanyId: 'empresa-1' }) }))
vi.mock('../api/periodosApi', () => ({ getPeriodos: vi.fn(), abrirPeriodo: vi.fn(), calcularPeriodo: vi.fn(), aprobarPeriodo: vi.fn() }))

beforeEach(() => {
  vi.mocked(getPeriodos).mockResolvedValue([])
  vi.mocked(abrirPeriodo).mockResolvedValue({ id: 'periodo-1', gestion: 2026, mes: 10, estado: 'ABIERTO' })
})
afterEach(() => { cleanup(); vi.clearAllMocks() })

it('abre un periodo de nómina independiente de la vigencia legal', async () => {
  const user = userEvent.setup()
  render(<PeriodosNominaPage />)
  await user.clear(screen.getByLabelText('Gestión'))
  await user.type(screen.getByLabelText('Gestión'), '2026')
  await user.selectOptions(screen.getByLabelText('Mes'), '10')
  await user.click(screen.getByRole('button', { name: 'Abrir periodo' }))
  await waitFor(() => expect(abrirPeriodo).toHaveBeenCalledWith(2026, 10, 'empresa-1'))
})

it('termina de cargar los periodos sin repetir la consulta', async () => {
  vi.mocked(getPeriodos).mockResolvedValue([{ id: 'periodo-1', gestion: 2026, mes: 10, estado: 'ABIERTO' }])
  render(<PeriodosNominaPage />)
  expect(await screen.findByText('2026-10')).toBeInTheDocument()
  expect(screen.queryByText('Cargando periodos…')).not.toBeInTheDocument()
  expect(getPeriodos).toHaveBeenCalledTimes(1)
})
