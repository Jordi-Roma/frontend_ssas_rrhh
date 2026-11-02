import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import { AuthContext } from '../context/AuthContext'
import { authApi } from '../api/authApi'
import { ChangePasswordPage } from './ChangePasswordPage'
import { LoginPage } from './LoginPage'

vi.mock('../api/authApi', () => ({
  authApi: { changePassword: vi.fn() },
}))

const logout = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(authApi.changePassword).mockResolvedValue({ message: 'Contraseña actualizada; vuelve a iniciar sesión' })
  logout.mockResolvedValue(undefined)
})

test('cambia la clave y devuelve al ingreso sin usar el evento tras la espera', async () => {
  render(
    <AuthContext.Provider value={{
      accessToken: 'token', login: vi.fn(), logout, refreshUser: vi.fn(), status: 'authenticated',
      user: { id: 'u1', name: 'Empleado', email: 'empleado@example.test', roles: [], permissions: [],
        modulos: [], realm: 'tenant', empresaId: 'e1', is_active: true, email_verified: true,
        must_change_password: true },
    }}>
      <MemoryRouter initialEntries={['/cambiar-clave']}>
        <Routes>
          <Route path="/cambiar-clave" element={<ChangePasswordPage />} />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )

  fireEvent.change(screen.getByLabelText('Contraseña actual'), { target: { value: 'clave-temporal-123' } })
  fireEvent.change(screen.getByLabelText('Nueva contraseña'), { target: { value: 'clave-nueva-segura-123' } })
  fireEvent.change(screen.getByLabelText('Confirmar contraseña'), { target: { value: 'clave-nueva-segura-123' } })
  fireEvent.click(screen.getByRole('button', { name: 'Guardar contraseña' }))

  await waitFor(() => expect(authApi.changePassword).toHaveBeenCalledWith('tenant', 'clave-temporal-123', 'clave-nueva-segura-123'))
  await waitFor(() => expect(logout).toHaveBeenCalledOnce())
  expect(await screen.findByText('Contraseña actualizada. Iniciá sesión con la nueva contraseña.')).toBeInTheDocument()
})
