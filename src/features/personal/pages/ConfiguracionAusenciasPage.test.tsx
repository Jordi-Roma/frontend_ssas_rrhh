import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../shared/api/httpClient'
import { getEmpleados } from '../../../shared/api/empleadosApi'
import { empleado } from '../../../test/sprint3Fixtures'
import { asignarSaldoVacaciones, crearTipoAusencia, editarTipoAusencia, getTiposAusencia, getTiposAusenciaConfiguracion } from '../api/ausenciasApi'
import { ConfiguracionAusenciasPage } from './ConfiguracionAusenciasPage'

const scope = vi.hoisted(() => ({ selectedCompanyId: 'empresa-demo', loading: false, write: true }))
vi.mock('../../../app/context/CompanyScopeContext', () => ({ useCompanyScope: () => scope }))
vi.mock('../../../app/access/AccessProvider', () => ({ useAccess: () => ({ can: () => scope.write }), Can: ({ children }: { children: ReactNode }) => scope.write ? children : null }))
vi.mock('../../../shared/api/empleadosApi', async original => ({ ...await original<typeof import('../../../shared/api/empleadosApi')>(), getEmpleados: vi.fn() }))
vi.mock('../api/ausenciasApi', () => ({ getTiposAusencia: vi.fn(), getTiposAusenciaConfiguracion: vi.fn(), crearTipoAusencia: vi.fn(), editarTipoAusencia: vi.fn(), asignarSaldoVacaciones: vi.fn() }))
beforeEach(() => {
  vi.resetAllMocks(); scope.write = true; scope.selectedCompanyId = 'empresa-demo'
  vi.mocked(getEmpleados).mockResolvedValue([empleado]); const tipos = [{ id: 'tipo-demo', codigo: 'VAC', nombre: 'Vacaciones demo', es_remunerado: true, descuenta_vacacion: true, requiere_documento: false, activo: true, dias_maximos_anio: null }]
  vi.mocked(getTiposAusencia).mockResolvedValue(tipos); vi.mocked(getTiposAusenciaConfiguracion).mockResolvedValue(tipos)
})
afterEach(cleanup)
async function fillForm() {
  await screen.findByRole('option', { name: /EMP-DEMO-01/ })
  await userEvent.selectOptions(screen.getByLabelText('Empleado'), empleado.id)
  await userEvent.clear(screen.getByLabelText('Gestión')); await userEvent.type(screen.getByLabelText('Gestión'), '2026')
  await userEvent.type(screen.getByLabelText('Días asignados'), '2')
}
describe('Ausencias con alcance parcial explícito', () => {
  it('muestra el catálogo y las acciones de gestión', async () => {
    render(<ConfiguracionAusenciasPage />)
    expect(await screen.findByText('Vacaciones demo')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Crear tipo' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument()
  })
  it('crea un tipo dentro de la empresa seleccionada', async () => {
    render(<ConfiguracionAusenciasPage />)
    await screen.findByText('Vacaciones demo')
    await userEvent.click(screen.getByRole('button', { name: 'Crear tipo' }))
    await userEvent.type(screen.getByLabelText(/Código/), 'LICENCIA_ESTUDIO')
    await userEvent.type(screen.getByLabelText('Nombre'), 'Licencia de estudio')
    await userEvent.click(screen.getAllByRole('button', { name: 'Crear tipo' })[1])
    expect(crearTipoAusencia).toHaveBeenCalledWith('empresa-demo', expect.objectContaining({ codigo: 'LICENCIA_ESTUDIO', nombre: 'Licencia de estudio' }))
  })
  it('desactiva un tipo sin borrarlo', async () => {
    render(<ConfiguracionAusenciasPage />)
    await screen.findByText('Vacaciones demo')
    await userEvent.click(screen.getByRole('button', { name: 'Desactivar' }))
    expect(editarTipoAusencia).toHaveBeenCalledWith('empresa-demo', 'tipo-demo', expect.objectContaining({ activo: false }))
  })
  it('mantiene la gestión y los días ante un 409, sin mostrar un saldo no confirmado', async () => {
    vi.mocked(asignarSaldoVacaciones).mockRejectedValue(new ApiError('No se puede reducir el saldo por debajo de lo ya utilizado', 409))
    render(<ConfiguracionAusenciasPage />); await fillForm(); await userEvent.click(screen.getByRole('button', { name: 'Asignar saldo' }))
    expect(await screen.findByText('No se puede reducir el saldo por debajo de lo ya utilizado')).toBeInTheDocument()
    expect(screen.getByLabelText('Gestión')).toHaveValue(2026); expect(screen.getByLabelText('Días asignados')).toHaveValue(2)
    expect(screen.queryByText('Disponibles')).not.toBeInTheDocument()
  })
  it('muestra únicamente el saldo devuelto por la escritura y lo limpia al cambiar la gestión', async () => {
    vi.mocked(asignarSaldoVacaciones).mockResolvedValue({ gestion: 2026, dias_asignados: 15, dias_usados: 4 })
    render(<ConfiguracionAusenciasPage />); await fillForm(); await userEvent.click(screen.getByRole('button', { name: 'Asignar saldo' }))
    expect(await screen.findByText('Disponibles')).toBeInTheDocument(); expect(screen.getByText('11')).toBeInTheDocument()
    expect(asignarSaldoVacaciones).toHaveBeenCalledWith(empleado.id, 2026, { gestion: 2026, dias_asignados: 2 }, 'empresa-demo')
    await userEvent.clear(screen.getByLabelText('Gestión')); expect(screen.queryByText('Disponibles')).not.toBeInTheDocument()
  })
  it('distingue error de catálogo y estado vacío, con reintento', async () => {
    vi.mocked(getTiposAusenciaConfiguracion).mockRejectedValueOnce(new Error('Consulta no disponible')).mockResolvedValueOnce([])
    render(<ConfiguracionAusenciasPage />); await screen.findByText('Consulta no disponible')
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('No hay tipos de ausencia para esta empresa.')).toBeInTheDocument()
  })
  it('oculta todo el formulario de escritura a quien solo puede consultar', async () => {
    scope.write = false; render(<ConfiguracionAusenciasPage />); await screen.findByText('Vacaciones demo')
    expect(screen.queryByLabelText('Días asignados')).not.toBeInTheDocument(); expect(asignarSaldoVacaciones).not.toHaveBeenCalled()
  })
  it('maneja un permiso de escritura revocado por el servidor', async () => {
    vi.mocked(asignarSaldoVacaciones).mockRejectedValue(new ApiError('Acceso revocado', 403))
    render(<ConfiguracionAusenciasPage />); await fillForm(); await userEvent.click(screen.getByRole('button', { name: 'Asignar saldo' }))
    expect(await screen.findByText(/No tienes permiso para asignar saldos. Acceso revocado/)).toBeInTheDocument()
  })
})
