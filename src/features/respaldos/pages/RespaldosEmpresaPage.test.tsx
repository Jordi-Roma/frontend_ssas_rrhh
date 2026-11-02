import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { respaldosEmpresaApi } from '../api/respaldosEmpresaApi'
import { RespaldosEmpresaPage } from './RespaldosEmpresaPage'

const scope = vi.hoisted(() => ({ companyId: 'empresa-demo', realm: 'platform', canConfigure: true }))
vi.mock('../../../app/context/CompanyScopeContext', () => ({
  useCompanyScope: () => ({ company: { id: scope.companyId }, companies: [] }),
}))
vi.mock('../../../app/access/AccessProvider', () => ({
  useAccess: () => ({ can: (code: string) => code !== 'backup:configurar' || scope.canConfigure }),
}))
vi.mock('../../auth/hooks/useAuth', () => ({
  useAuth: () => ({ user: { realm: scope.realm, empresaId: 'empresa-demo' } }),
}))
vi.mock('../api/respaldosEmpresaApi', () => ({
  respaldosEmpresaApi: {
    list: vi.fn(), latest: vi.fn(), config: vi.fn(), updateConfig: vi.fn(),
  },
}))

beforeEach(() => {
  vi.resetAllMocks()
  scope.companyId = 'empresa-demo'
  scope.realm = 'platform'
  scope.canConfigure = true
  vi.mocked(respaldosEmpresaApi.list).mockResolvedValue([])
  vi.mocked(respaldosEmpresaApi.latest).mockResolvedValue({ ultimo_intento: null, ultimo_exitoso: null })
  vi.mocked(respaldosEmpresaApi.config).mockResolvedValue({
    empresa_id: 'empresa-demo', auto_habilitado: true, hora_local: '02:00',
    zona_horaria: 'America/La_Paz', hora_configurable: true, retencion_dias: 30, servicio_habilitado: true,
  })
  vi.mocked(respaldosEmpresaApi.updateConfig).mockResolvedValue({
    empresa_id: 'empresa-demo', auto_habilitado: true, hora_local: '03:15',
    zona_horaria: 'America/La_Paz', hora_configurable: true, retencion_dias: 30, servicio_habilitado: true,
  })
})
afterEach(cleanup)

describe('Programacion de respaldos por empresa', () => {
  it('guarda la hora local solo para la empresa seleccionada', async () => {
    render(<RespaldosEmpresaPage />)
    expect(await screen.findByText('Programación automática')).toBeInTheDocument()
    const input = await screen.findByLabelText(/Hora del respaldo/)
    expect(input).toHaveValue('02:00')
    expect(screen.getByText('Horario de Bolivia')).toBeInTheDocument()
    fireEvent.change(input, { target: { value: '03:15' } })
    await userEvent.click(screen.getByRole('button', { name: 'Guardar hora' }))
    expect(respaldosEmpresaApi.updateConfig).toHaveBeenCalledWith(
      'empresa-demo', { hora_local: '03:15' },
    )
    expect(input).toHaveValue('03:15')
  })

  it('oculta la configuracion anterior al cambiar de empresa', async () => {
    const view = render(<RespaldosEmpresaPage />)
    expect(await screen.findByLabelText(/Hora del respaldo/)).toHaveValue('02:00')
    scope.companyId = 'otra-empresa'
    vi.mocked(respaldosEmpresaApi.config).mockImplementation(() => new Promise(() => {}))
    view.rerender(<RespaldosEmpresaPage />)
    expect(screen.queryByLabelText(/Hora del respaldo/)).not.toBeInTheDocument()
  })

  it('permite al administrador de empresa guardar su horario sin mostrar el control global', async () => {
    scope.realm = 'tenant'
    render(<RespaldosEmpresaPage />)
    const input = await screen.findByLabelText(/Hora del respaldo/)
    expect(respaldosEmpresaApi.config).toHaveBeenCalledWith('empresa-demo')
    expect(screen.queryByText('Activar copia diaria')).not.toBeInTheDocument()
    fireEvent.change(input, { target: { value: '04:30' } })
    await userEvent.click(screen.getByRole('button', { name: 'Guardar hora' }))
    expect(respaldosEmpresaApi.updateConfig).toHaveBeenCalledWith('empresa-demo', { hora_local: '04:30' })
  })

  it('no consulta la configuracion sin permiso de empresa', async () => {
    scope.realm = 'tenant'
    scope.canConfigure = false
    render(<RespaldosEmpresaPage />)
    expect(await screen.findByText('Historial')).toBeInTheDocument()
    expect(respaldosEmpresaApi.config).not.toHaveBeenCalled()
  })
})
