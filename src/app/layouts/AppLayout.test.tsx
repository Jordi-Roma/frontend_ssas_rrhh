import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { AppLayout } from './AppLayout'

vi.mock('../../features/auth/hooks/useAuth', () => ({
  useAuth: () => ({ user: { realm: 'tenant', name: 'Test', email: 'test@example.com' }, logout: vi.fn() }),
}))
vi.mock('../context/CompanyScopeContext', () => ({
  useCompanyScope: () => ({ company: null, companies: [], error: null, loading: false }),
}))
vi.mock('../access/AccessProvider', () => ({
  useAccess: () => ({ can: () => true, hasModulo: () => true }),
}))
vi.mock('../../features/ayuda/components/ChatWidget', () => ({ ChatWidget: () => null }))

afterEach(cleanup)

function renderLayout(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="*" element={<AppLayout />} />
      </Routes>
    </MemoryRouter>,
  )
}

it('opens the active section and keeps only one section expanded', async () => {
  renderLayout('/vacantes')
  const user = userEvent.setup()

  expect(screen.getByRole('button', { name: 'Reclutamiento' })).toHaveAttribute('aria-expanded', 'true')
  expect(screen.getByRole('link', { name: 'Vacantes' })).toBeVisible()
  expect(screen.queryByRole('link', { name: 'Usuarios' })).not.toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: 'Administración' }))
  expect(screen.getByRole('button', { name: 'Reclutamiento' })).toHaveAttribute('aria-expanded', 'false')
  expect(screen.getByRole('button', { name: 'Administración' })).toHaveAttribute('aria-expanded', 'true')
  expect(screen.getByRole('link', { name: 'Usuarios' })).toBeVisible()

  await user.click(screen.getByRole('button', { name: 'Administración' }))
  expect(screen.getByRole('button', { name: 'Administración' })).toHaveAttribute('aria-expanded', 'false')
})

it('keeps the selected section open after navigating', async () => {
  renderLayout('/')
  const user = userEvent.setup()

  expect(screen.getByRole('link', { name: 'Inicio' })).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Cuenta' }))
  await user.click(screen.getByRole('link', { name: 'Mi perfil' }))

  expect(screen.getByRole('button', { name: 'Cuenta' })).toHaveAttribute('aria-expanded', 'true')
  expect(screen.getByRole('link', { name: 'Mi perfil' })).toHaveClass('active')
})
