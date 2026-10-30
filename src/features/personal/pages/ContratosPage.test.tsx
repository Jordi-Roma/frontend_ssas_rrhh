import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../shared/api/httpClient'
import { getEmpleado, getEmpleados } from '../../../shared/api/empleadosApi'
import { getCargos, getDepartamentos } from '../../../shared/api/organizacionCatalogosApi'
import { cargo, contrato, departamento, empleado } from '../../../test/sprint3Fixtures'
import { crearContrato, getContratos } from '../api/contratosApi'
import { ContratosPage } from './ContratosPage'

const scope = vi.hoisted(() => ({ selectedCompanyId: 'empresa-demo', loading: false, write: true }))
vi.mock('../../../app/context/CompanyScopeContext', () => ({ useCompanyScope: () => scope }))
vi.mock('../../../app/access/AccessProvider', () => ({ useAccess: () => ({ can: () => scope.write }), Can: ({ children }: { children: ReactNode }) => scope.write ? children : null }))
vi.mock('../../../shared/api/empleadosApi', async original => ({ ...await original<typeof import('../../../shared/api/empleadosApi')>(), getEmpleados: vi.fn(), getEmpleado: vi.fn() }))
vi.mock('../../../shared/api/organizacionCatalogosApi', () => ({ getCargos: vi.fn(), getDepartamentos: vi.fn() }))
vi.mock('../api/contratosApi', async original => ({ ...await original<typeof import('../api/contratosApi')>(), getContratos: vi.fn(), crearContrato: vi.fn() }))
beforeEach(() => {
  vi.resetAllMocks(); scope.selectedCompanyId = 'empresa-demo'; scope.write = true
  vi.mocked(getEmpleados).mockResolvedValue([empleado]); vi.mocked(getEmpleado).mockResolvedValue(empleado)
  vi.mocked(getCargos).mockResolvedValue([cargo]); vi.mocked(getDepartamentos).mockResolvedValue([departamento]); vi.mocked(getContratos).mockResolvedValue([contrato])
})
afterEach(cleanup)
async function selectEmployee() {
  await screen.findByRole('option', { name: /EMP-DEMO-01/ })
  await userEvent.selectOptions(screen.getByLabelText('Empleado'), empleado.id)
  await screen.findByText('Contrato vigente')
}
async function openForm() {
  await userEvent.click(await screen.findByRole('button', { name: /Nueva versión/ }))
  await waitFor(() => expect(screen.getByLabelText('N.º de contrato')).toBeEnabled())
  await userEvent.type(screen.getByLabelText('N.º de contrato'), 'CT-DEMO-02')
  fireEvent.change(screen.getByLabelText('Fecha de inicio'), { target: { value: '2026-12-01' } })
}

describe('Contratos del sprint 3', () => {
  it('muestra el vigente y las versiones en su orden, sin permitir editar el historial', async () => {
    vi.mocked(getContratos).mockResolvedValue([contrato, { ...contrato, id: 'anterior', estado: 'REEMPLAZADO', numero_contrato: 'CT-ANTERIOR', fecha_inicio: '2026-01-15', fecha_fin: '2026-09-30', salario_basico: '8000.00' }])
    render(<ContratosPage />); await selectEmployee()
    expect(screen.getByText('CT-ANTERIOR', { exact: false })).toBeInTheDocument()
    expect(screen.getByText(/▲ BOB 1.500,00/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Editar/ })).not.toBeInTheDocument()
  })
  it('distingue un historial vacío de un fallo de consulta y permite reintentar', async () => {
    vi.mocked(getContratos).mockRejectedValueOnce(new ApiError('No tienes acceso', 403)).mockResolvedValueOnce([])
    render(<ContratosPage />)
    await screen.findByRole('option', { name: /EMP-DEMO-01/ }); await userEvent.selectOptions(screen.getByLabelText('Empleado'), empleado.id)
    expect(await screen.findByText('No tienes acceso')).toBeInTheDocument()
    expect(screen.queryByText('Este empleado todavía no tiene contratos registrados')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar contratos' }))
    expect(await screen.findByText('Este empleado todavía no tiene contratos registrados')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Registrar contrato/ })).toBeEnabled()
  })
  it.each(['La nueva version debe comenzar despues de la anterior', 'No se puede alterar un periodo con nomina aprobada'])('conserva los valores frente al conflicto: %s', async message => {
    vi.mocked(crearContrato).mockRejectedValue(new ApiError(message, 409))
    render(<ContratosPage />); await selectEmployee(); await openForm()
    await userEvent.click(screen.getByRole('button', { name: 'Registrar versión' }))
    expect(await screen.findByText(message)).toBeInTheDocument()
    expect(screen.getByLabelText('N.º de contrato')).toHaveValue('CT-DEMO-02')
    expect(screen.getByLabelText('Fecha de inicio')).toHaveValue('2026-12-01')
  })
  it('muestra el 403 de escritura y los errores de campo 422 sin cerrar el formulario', async () => {
    vi.mocked(crearContrato).mockRejectedValueOnce(new ApiError('Cargo inválido', 422, { cargo_id: 'Elige un cargo autorizado' })).mockRejectedValueOnce(new ApiError('Acceso revocado', 403))
    render(<ContratosPage />); await selectEmployee(); await openForm()
    await userEvent.click(screen.getByRole('button', { name: 'Registrar versión' })); await screen.findByText('Elige un cargo autorizado')
    await userEvent.click(screen.getByRole('button', { name: 'Registrar versión' }))
    expect(await screen.findByText(/No tienes permiso para registrar contratos. Acceso revocado/)).toBeInTheDocument()
  })
  it('recarga el historial después de crear y envía el cuerpo generado con alcance de empresa', async () => {
    vi.mocked(crearContrato).mockResolvedValue({ ...contrato, numero_contrato: 'CT-DEMO-02' })
    render(<ContratosPage />); await selectEmployee(); await openForm()
    await userEvent.click(screen.getByRole('button', { name: 'Registrar versión' }))
    await screen.findByText(/Versión registrada/)
    expect(crearContrato).toHaveBeenCalledWith(empleado.id, expect.objectContaining({ numero_contrato: 'CT-DEMO-02', fecha_inicio: '2026-12-01', fecha_fin: null, minutos_descanso: 60 }), 'empresa-demo')
    expect(getContratos).toHaveBeenCalledTimes(2)
  })
  it('oculta la escritura sin permiso', async () => {
    scope.write = false; render(<ContratosPage />); await selectEmployee()
    expect(screen.queryByRole('button', { name: /Nueva versión/ })).not.toBeInTheDocument()
  })
  it('descarta una respuesta tardía al cambiar de empresa', async () => {
    let finish!: (value: typeof contrato[]) => void
    vi.mocked(getContratos).mockImplementation(() => new Promise(resolve => { finish = resolve }))
    const view = render(<ContratosPage />)
    await screen.findByRole('option', { name: /EMP-DEMO-01/ }); await userEvent.selectOptions(screen.getByLabelText('Empleado'), empleado.id)
    await waitFor(() => expect(getContratos).toHaveBeenCalled())
    scope.selectedCompanyId = 'otra-empresa'; view.rerender(<ContratosPage />)
    await act(async () => finish([contrato]))
    expect(screen.queryByText('Contrato vigente')).not.toBeInTheDocument()
    expect(screen.getByText('Selecciona un empleado para ver su historial')).toBeInTheDocument()
  })
})
