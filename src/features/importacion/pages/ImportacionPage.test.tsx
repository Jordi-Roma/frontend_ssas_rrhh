import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { importacionApi } from '../api/importacionApi'
import { ImportacionPage } from './ImportacionPage'

vi.mock('../../../app/context/CompanyScopeContext', () => ({
  useCompanyScope: () => ({ selectedCompanyId: 'company-a' }),
}))
vi.mock('../../../app/access/AccessProvider', () => ({
  useAccess: () => ({ can: () => true }),
}))
vi.mock('../../auth/hooks/useAuth', () => ({
  useAuth: () => ({ user: { realm: 'tenant' } }),
}))
vi.mock('../api/importacionApi', () => ({
  importacionApi: { plantilla: vi.fn(), preview: vi.fn(), confirm: vi.fn() },
}))

afterEach(() => { cleanup(); vi.clearAllMocks() })

it('imports Excel users after preview without showing the initial password', async () => {
  vi.mocked(importacionApi.preview).mockResolvedValue({
    sha256: 'digest', crear: 1, omitir: 0, errores: 0,
    filas: [{ fila: 2, accion: 'crear', errores: [], datos: {
      nombre: 'Ana', apellido: 'Paz', email: 'ana@example.com',
      username: 'anapaz', rol_codigo: 'RECLUTADOR', telefono: '',
    } }],
  })
  vi.mocked(importacionApi.confirm).mockResolvedValue({
    sha256: 'digest', crear: 1, omitir: 0, errores: 0, filas: [],
  })
  const user = userEvent.setup()
  render(<ImportacionPage />)
  await user.selectOptions(screen.getByLabelText('Datos'), 'usuarios')
  await user.selectOptions(screen.getByLabelText('Plantilla'), 'xlsx')
  const file = new File(['sample'], 'usuarios.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  await user.upload(screen.getByLabelText('Archivo'), file)
  await user.click(screen.getByRole('button', { name: 'Previsualizar' }))
  expect(await screen.findByText(/Ana Paz/)).toBeInTheDocument()
  expect(screen.queryByText('Strong!Pass1234')).not.toBeInTheDocument()
  expect(importacionApi.preview).toHaveBeenCalledWith('usuarios', file, 'company-a')
  await user.click(screen.getByRole('button', { name: 'Confirmar importación' }))
  await waitFor(() => expect(importacionApi.confirm).toHaveBeenCalledWith('usuarios', file, 'digest', 'company-a'))
})

it('previews employee records without displaying identity or bank details', async () => {
  vi.mocked(importacionApi.preview).mockResolvedValue({
    sha256: 'digest', crear: 1, omitir: 0, errores: 0,
    filas: [{ fila: 2, accion: 'crear', errores: [], datos: {
      codigo: 'E-01', nombres: 'Ana', apellido_paterno: 'Paz', estado: 'ACTIVO', fecha_ingreso: '2020-01-10',
    } }],
  })
  const user = userEvent.setup()
  render(<ImportacionPage />)
  await user.selectOptions(screen.getByLabelText('Datos'), 'empleados')
  const file = new File(['sample'], 'empleados.csv', { type: 'text/csv' })
  await user.upload(screen.getByLabelText('Archivo'), file)
  await user.click(screen.getByRole('button', { name: 'Previsualizar' }))
  expect(await screen.findByText('E-01 · Ana Paz')).toBeInTheDocument()
  expect(screen.queryByText('001234')).not.toBeInTheDocument()
  expect(screen.queryByText('000777')).not.toBeInTheDocument()
  expect(importacionApi.preview).toHaveBeenCalledWith('empleados', file, 'company-a')
})
