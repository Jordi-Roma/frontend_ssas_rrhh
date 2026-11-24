import { act, cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { DashboardPage } from './DashboardPage'
import { getDashboardResumen } from '../../features/dashboard/api/dashboardApi'

const auth = vi.hoisted(() => ({ realm: 'tenant' as 'tenant' | 'platform' }))
vi.mock('../../features/auth/hooks/useAuth', () => ({ useAuth: () => ({ user: { realm: auth.realm, name: 'Jordi' } }) }))
vi.mock('../../features/dashboard/api/dashboardApi', () => ({ getDashboardResumen: vi.fn() }))
afterEach(() => { cleanup(); vi.resetAllMocks(); auth.realm = 'tenant' })

it('muestra los gráficos de la empresa con los totales recibidos', async () => {
  vi.mocked(getDashboardResumen).mockResolvedValue({
    alcance: 'EMPRESA', empresa_id: 'e1',
    empresa: { usuarios_activos: 8, usuarios_inactivos: 2, vacantes_por_estado: { PUBLICADA: 3, PAUSADA: 1 }, postulaciones_por_etapa: { Entrevista: 5 }, departamentos: 2, cargos: 4 },
    plataforma: null, bitacora_reciente: [],
  })
  render(<MemoryRouter><DashboardPage /></MemoryRouter>)
  expect(await screen.findByRole('img', { name: 'Activos: 8; Inactivos: 2' })).toBeInTheDocument()
  expect(screen.getByRole('img', { name: 'PUBLICADA: 3' })).toBeInTheDocument()
  expect(screen.getByRole('img', { name: 'Entrevista: 5' })).toBeInTheDocument()
})

it('muestra la composición global al administrador de plataforma', async () => {
  auth.realm = 'platform'
  vi.mocked(getDashboardResumen).mockResolvedValue({
    alcance: 'PLATAFORMA', empresa_id: null, empresa: null,
    plataforma: { empresas_activas: 6, empresas_suspendidas: 1, empresas_eliminadas: 0, usuarios_totales: 42, vacantes_publicadas: 9, postulaciones_del_mes: 18 },
    bitacora_reciente: [],
  })
  render(<MemoryRouter><DashboardPage /></MemoryRouter>)
  expect(await screen.findByRole('img', { name: 'Activas: 6; Suspendidas: 1' })).toBeInTheDocument()
  expect(screen.getByText('Usuarios registrados')).toBeInTheDocument()
})

it('destaca una acción de otra sesión cuando llegan datos nuevos', async () => {
  const initial = {
    alcance: 'EMPRESA' as const, empresa_id: 'e1',
    empresa: { usuarios_activos: 8, usuarios_inactivos: 2, vacantes_por_estado: { PUBLICADA: 3 }, postulaciones_por_etapa: { Entrevista: 5 }, departamentos: 2, cargos: 4 },
    plataforma: null, bitacora_reciente: [],
  }
  vi.mocked(getDashboardResumen).mockResolvedValueOnce(initial).mockResolvedValueOnce({
    ...initial, empresa: { ...initial.empresa, usuarios_activos: 9 },
    bitacora_reciente: [{ id: 'evento-1', modulo: 'usuarios', accion: 'crear_usuario', nivel: 'INFO', descripcion: 'Usuario creado', actor: 'Franco', fecha: '2026-11-24T14:00:00Z' }],
  })
  vi.useFakeTimers()
  try {
    render(<MemoryRouter><DashboardPage /></MemoryRouter>)
    await act(async () => { await Promise.resolve() })
    expect(screen.queryByText('Actualización recibida')).not.toBeInTheDocument()
    await act(async () => { await vi.advanceTimersByTimeAsync(3000) })
    expect(screen.getByText('Actualización recibida')).toBeInTheDocument()
    expect(screen.getByText('Franco: crear usuario (usuarios)')).toBeInTheDocument()
    expect(screen.getByText('Nuevo')).toBeInTheDocument()
    expect(screen.getByText('Usuarios activos').closest('article')).toHaveClass('dashboard-stat-updated')
  } finally { vi.useRealTimers() }
})
