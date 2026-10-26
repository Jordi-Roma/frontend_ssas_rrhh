import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../shared/api/httpClient'
import { getEmpleado, getEmpleados } from '../../../shared/api/empleadosApi'
import { boleta, empleado, empresa, periodo } from '../../../test/sprint3Fixtures'
import { getBoleta, getBoletasDePeriodo, getPeriodos } from '../api/nominaApi'
import { BoletasPage } from './BoletasPage'

const scope = vi.hoisted(() => ({ selectedCompanyId: 'empresa-demo', loading: false, allowed: true }))
vi.mock('../../../app/context/CompanyScopeContext', () => ({ useCompanyScope: () => ({ ...scope, company: empresa }) }))
vi.mock('../../../app/access/AccessProvider', () => ({ useAccess: () => ({ can: () => scope.allowed }) }))
vi.mock('../../../shared/api/empleadosApi', async original => ({ ...await original<typeof import('../../../shared/api/empleadosApi')>(), getEmpleados: vi.fn(), getEmpleado: vi.fn() }))
vi.mock('../api/nominaApi', async original => ({ ...await original<typeof import('../api/nominaApi')>(), getPeriodos: vi.fn(), getBoletasDePeriodo: vi.fn(), getBoleta: vi.fn() }))
beforeEach(() => {
  vi.resetAllMocks(); scope.selectedCompanyId = 'empresa-demo'; scope.allowed = true
  vi.mocked(getPeriodos).mockResolvedValue([periodo]); vi.mocked(getEmpleados).mockResolvedValue([empleado]); vi.mocked(getEmpleado).mockResolvedValue(empleado)
  vi.mocked(getBoletasDePeriodo).mockResolvedValue([{ id: boleta.id, empleado_id: empleado.id, liquido_pagable: boleta.liquido_pagable }]); vi.mocked(getBoleta).mockResolvedValue(boleta)
})
afterEach(cleanup)
async function selectPeriod() {
  await screen.findByRole('option', { name: /octubre de 2026/ })
  await userEvent.selectOptions(screen.getByLabelText('Periodo'), periodo.id)
  await screen.findByRole('button', { name: 'Ver boleta' })
}
describe('Consulta de boletas por RRHH', () => {
  it('cruza empleados, filtra por código y muestra el documento sin recalcular los totales', async () => {
    render(<BoletasPage />); await selectPeriod()
    expect(screen.getByText('Lucía Demo Ejemplo')).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Buscar empleado'), 'EMP-DEMO-01')
    await userEvent.click(screen.getByRole('button', { name: 'Ver boleta' }))
    const document = await screen.findByRole('article', { name: 'Boleta de pago' })
    expect(within(document).getByText('Bs 7.812,45')).toBeInTheDocument()
    const aportes = within(document).getByRole('table', { name: 'Aportes del empleador' })
    expect(within(aportes).getByText('CNS_PATRONAL')).toBeInTheDocument()
    expect(within(aportes).getByText('Bs 1.359,04')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Imprimir' })).toBeEnabled()
    expect(screen.queryByRole('button', { name: /Descargar PDF/ })).not.toBeInTheDocument()
  })
  it('advierte al consultar e imprimir un periodo no aprobado', async () => {
    vi.mocked(getPeriodos).mockResolvedValue([{ ...periodo, estado: 'CALCULADO' }])
    render(<BoletasPage />); await selectPeriod()
    expect(screen.getByText(/Las boletas son provisionales/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Ver boleta' }))
    expect(await screen.findByText('PROVISIONAL')).toBeInTheDocument()
  })
  it('resuelve un empleado que no está en la primera página sin romper la fila', async () => {
    vi.mocked(getEmpleados).mockResolvedValue([])
    render(<BoletasPage />); await selectPeriod()
    expect(screen.getByText(`Empleado · ref. ${empleado.id}`)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Ver boleta' }))
    await screen.findByText(/EMP-DEMO-01 — Lucía Demo Ejemplo/)
    expect(getEmpleado).toHaveBeenCalledWith(empleado.id, 'empresa-demo')
  })
  it('pagina los empleados con offset y conserva la lista de boletas', async () => {
    vi.mocked(getEmpleados).mockResolvedValueOnce(Array.from({ length: 50 }, (_, index) => ({ ...empleado, id: `empleado-${index}`, codigo: `EMP-${index}` }))).mockResolvedValueOnce([empleado])
    render(<BoletasPage />); await selectPeriod()
    await userEvent.click(screen.getByRole('button', { name: 'Cargar más empleados' }))
    expect(await screen.findByText('EMP-DEMO-01')).toBeInTheDocument()
    expect(getEmpleados).toHaveBeenLastCalledWith('empresa-demo', 50, 50)
    expect(getBoletasDePeriodo).toHaveBeenCalledTimes(1)
  })
  it('distingue un fallo de periodos de un listado vacío y permite reintentar', async () => {
    vi.mocked(getPeriodos).mockRejectedValueOnce(new ApiError('Sin permiso de nómina', 403)).mockResolvedValueOnce([])
    render(<BoletasPage />); await screen.findByText('Sin permiso de nómina')
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar periodos' }))
    expect(await screen.findByText('No hay periodos de nómina')).toBeInTheDocument()
  })
  it('muestra el error del detalle y permite reconsultarlo', async () => {
    vi.mocked(getBoleta).mockRejectedValueOnce(new ApiError('Boleta no encontrada', 404)).mockResolvedValueOnce(boleta)
    render(<BoletasPage />); await selectPeriod(); await userEvent.click(screen.getByRole('button', { name: 'Ver boleta' }))
    await screen.findByText('Boleta no encontrada')
    expect(screen.getByRole('button', { name: 'Imprimir' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar boleta' }))
    expect(await screen.findByRole('article', { name: 'Boleta de pago' })).toBeInTheDocument()
  })
  it('descarta el detalle abierto al cambiar de empresa aunque termine después', async () => {
    let finish!: (value: typeof boleta) => void
    vi.mocked(getBoleta).mockImplementation(() => new Promise(resolve => { finish = resolve }))
    const view = render(<BoletasPage />); await selectPeriod(); await userEvent.click(screen.getByRole('button', { name: 'Ver boleta' }))
    await waitFor(() => expect(getBoleta).toHaveBeenCalled())
    scope.selectedCompanyId = 'empresa-b'; view.rerender(<BoletasPage />)
    await act(async () => finish(boleta))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
