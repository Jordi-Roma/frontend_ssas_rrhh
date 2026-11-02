import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { rolesApi } from '../api/rolesApi'
import { RolesPage } from './RolesPage'

const { refreshUser } = vi.hoisted(() => ({ refreshUser: vi.fn().mockResolvedValue(undefined) }))
vi.mock('../../../app/context/CompanyScopeContext', () => ({ useCompanyScope: () => ({ company: { id: 'empresa-1' } }) }))
vi.mock('../../auth/hooks/useAuth', () => ({ useAuth: () => ({ refreshUser }) }))
vi.mock('../api/rolesApi', () => ({ rolesApi: { list: vi.fn(), permisos: vi.fn(), assignPermissions: vi.fn(), create: vi.fn(), update: vi.fn() } }))

afterEach(() => { cleanup(); vi.clearAllMocks() })

it('permite editar permisos del rol principal y muestra lo guardado', async () => {
  const user = userEvent.setup()
  const permiso = { id: 'permiso-1', codigo: 'boletas:mi', modulo: 'ORGANIZACION', recurso: 'boletas', operacion: 'mi', descripcion: 'Boletas propias' }
  const permisoDelRol = { id: 'permiso-1', name: 'boletas:mi', resource: 'boletas', action: 'mi', description: 'Boletas propias' }
  const role = { id: 'rol-1', empresa_id: 'empresa-1', name: 'Empleado', codigo: 'EMPLEADO', es_base: true, is_active: true, permissions: [] }
  vi.mocked(rolesApi.list).mockResolvedValue([role])
  vi.mocked(rolesApi.permisos).mockResolvedValue([permiso])
  vi.mocked(rolesApi.assignPermissions).mockResolvedValue({ ...role, permissions: [permisoDelRol] })
  render(<RolesPage />)
  await user.click(await screen.findByRole('button', { name: 'Permisos' }))
  await user.click(screen.getByRole('checkbox', { name: /Mi Boletas/i }))
  await user.click(screen.getByRole('button', { name: 'Guardar permisos' }))
  await waitFor(() => expect(rolesApi.assignPermissions).toHaveBeenCalledWith('rol-1', ['permiso-1'], 'empresa-1'))
  expect(await screen.findByText('1 permisos')).toBeInTheDocument()
})
