import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { decidirAusencia, getAusenciasEquipo } from '../api/ausenciasJefeApi'
import { BandejaAusenciasPage } from './BandejaAusenciasPage'

const scope = vi.hoisted(() => ({ selectedCompanyId: 'empresa-demo' }))
vi.mock('../../../app/context/CompanyScopeContext', () => ({ useCompanyScope: () => scope }))
vi.mock('../api/ausenciasJefeApi', () => ({ getAusenciasEquipo: vi.fn(), decidirAusencia: vi.fn() }))

beforeEach(() => {
  vi.resetAllMocks()
  scope.selectedCompanyId = 'empresa-demo'
  vi.mocked(getAusenciasEquipo).mockResolvedValue([{
    id: 'solicitud-demo',
    empleado_id: 'empleado-demo',
    tipo_ausencia: 'VACACION',
    fecha_inicio: '2026-10-26',
    fecha_fin: '2026-10-27',
    estado: 'PENDIENTE',
  }])
  vi.mocked(decidirAusencia).mockResolvedValue({})
})
afterEach(cleanup)

describe('Bandeja de ausencias', () => {
  it('envia la aprobacion de vacaciones con dias revisados y empresa activa', async () => {
    render(<BandejaAusenciasPage />)
    await userEvent.click(await screen.findByRole('button', { name: 'Revisar' }))
    await userEvent.type(screen.getByLabelText('Días hábiles'), '2')
    await userEvent.click(screen.getByRole('button', { name: 'Aprobar' }))
    expect(decidirAusencia).toHaveBeenCalledWith('solicitud-demo', 'APROBAR', '', 2, 'empresa-demo')
  })

  it('no consulta solicitudes sin empresa seleccionada', () => {
    scope.selectedCompanyId = ''
    render(<BandejaAusenciasPage />)
    expect(screen.getByText('Selecciona una empresa')).toBeInTheDocument()
    expect(getAusenciasEquipo).not.toHaveBeenCalled()
  })
})
