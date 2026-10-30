import type { ReactNode } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { rolesAsignablesApi } from '../api/rolesAsignablesApi'
import { usuariosApi } from '../api/usuariosApi'
import { ListadoUsuariosPage } from './ListadoUsuariosPage'

vi.mock('../../../app/context/CompanyScopeContext', () => ({
  useCompanyScope: () => ({ company: { id: 'empresa-1', nombre_comercial: 'Empresa 1' } }),
}))
vi.mock('../../../app/access/AccessProvider', () => ({
  useAccess: () => ({ can: () => true }),
  Can: ({ children }: { children: ReactNode }) => <>{children}</>,
}))
vi.mock('../../auth/hooks/useAuth', () => ({
  useAuth: () => ({ user: { realm: 'platform' } }),
}))
vi.mock('../api/rolesAsignablesApi', () => ({
  rolesAsignablesApi: { list: vi.fn() },
}))
vi.mock('../api/usuariosApi', () => ({
  usuariosApi: { list: vi.fn(), create: vi.fn() },
}))

beforeEach(() => {
  vi.mocked(usuariosApi.list).mockReset().mockResolvedValue({
    items: [], total: 0, page: 1, per_page: 25, total_pages: 0,
  })
  vi.mocked(usuariosApi.create).mockReset().mockResolvedValue({} as never)
  vi.mocked(rolesAsignablesApi.list).mockReset().mockResolvedValue([{
    id: 'rol-global', name: 'Super Admin', codigo: 'SUPER_ADMIN',
  } as Awaited<ReturnType<typeof rolesAsignablesApi.list>>[number]])
})

afterEach(cleanup)

it('lists and creates a global administrator without the selected company', async () => {
  const user = userEvent.setup()
  render(<ListadoUsuariosPage scope="platform" />)

  await waitFor(() => expect(usuariosApi.list).toHaveBeenCalledWith(
    expect.objectContaining({ empresa_id: undefined }),
  ))
  expect(rolesAsignablesApi.list).toHaveBeenCalledWith(undefined)

  await user.click(screen.getByRole('button', { name: 'Nuevo administrador' }))
  await user.type(screen.getByLabelText('Nombres'), 'Ana')
  await user.type(screen.getByLabelText('Apellidos'), 'Paz')
  await user.type(screen.getByLabelText('Correo electrónico'), 'ana@example.com')
  await user.type(screen.getByLabelText(/^Nombre de usuario/), 'anapaz')
  await user.click(await screen.findByRole('checkbox', { name: 'Super Admin' }))
  await user.type(screen.getByLabelText(/^Contraseña provisional/), 'ClaveSegura!123')
  await user.click(screen.getByRole('button', { name: 'Crear administrador' }))

  await waitFor(() => expect(usuariosApi.create).toHaveBeenCalledWith(
    expect.objectContaining({ username: 'anapaz', role_ids: ['rol-global'] }),
  ))
  expect(vi.mocked(usuariosApi.create).mock.calls[0][0]).not.toHaveProperty('empresa_id')
})

it('keeps the company users page scoped to the selected company', async () => {
  render(<ListadoUsuariosPage scope="company" />)

  await waitFor(() => expect(usuariosApi.list).toHaveBeenCalledWith(
    expect.objectContaining({ empresa_id: 'empresa-1' }),
  ))
  expect(rolesAsignablesApi.list).toHaveBeenCalledWith('empresa-1')
  expect(screen.getByRole('heading', { name: 'Usuarios' })).toBeInTheDocument()
})
