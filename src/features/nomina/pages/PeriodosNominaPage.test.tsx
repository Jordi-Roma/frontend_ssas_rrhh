import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { abrirPeriodo, getPeriodos } from '../api/periodosApi'
import { registrarDatosTributarios } from '../api/periodosApi'
import { getEmpleados } from '../../../shared/api/empleadosApi'
import { empleado } from '../../../test/sprint3Fixtures'
import { PeriodosNominaPage } from './PeriodosNominaPage'

vi.mock('../../../app/context/CompanyScopeContext', () => ({ useCompanyScope: () => ({ selectedCompanyId: 'empresa-1' }) }))
vi.mock('../api/periodosApi', () => ({ getPeriodos: vi.fn(), abrirPeriodo: vi.fn(), calcularPeriodo: vi.fn(), aprobarPeriodo: vi.fn(), registrarDatosTributarios: vi.fn() }))
vi.mock('../../../shared/api/empleadosApi', async original => ({ ...await original<typeof import('../../../shared/api/empleadosApi')>(), getEmpleados: vi.fn() }))

beforeEach(() => {
  vi.mocked(getPeriodos).mockResolvedValue([])
  vi.mocked(getEmpleados).mockResolvedValue([empleado])
  vi.mocked(abrirPeriodo).mockResolvedValue({ id: 'periodo-1', gestion: 2026, mes: 10, estado: 'ABIERTO' })
  vi.mocked(registrarDatosTributarios).mockResolvedValue({})
})

it('registra datos tributarios de un empleado antes de calcular', async () => {
  vi.mocked(getPeriodos).mockResolvedValue([{ id: 'periodo-1', gestion: 2026, mes: 10, estado: 'ABIERTO' }])
  const user = userEvent.setup()
  render(<PeriodosNominaPage />)
  await user.click(await screen.findByRole('button', { name: 'Datos RC-IVA' }))
  await user.selectOptions(screen.getByLabelText('Empleado'), empleado.id)
  await user.type(screen.getByLabelText('Referencia de planilla tributaria'), 'Planilla octubre 2026')
  await user.click(screen.getByRole('button', { name: 'Guardar datos' }))
  await waitFor(() => expect(registrarDatosTributarios).toHaveBeenCalledWith('periodo-1', expect.objectContaining({ empleado_id: empleado.id, f110_credito: 0, referencia_planilla: 'Planilla octubre 2026' }), 'empresa-1'))
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
