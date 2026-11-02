import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { getMisAusencias, getTiposAusencia, solicitarAusencia, subirComprobantePropio } from '../api/ausenciasApi'
import { MisAusenciasPage } from './MisAusenciasPage'

vi.mock('../../../app/context/CompanyScopeContext', () => ({ useCompanyScope: () => ({ selectedCompanyId: 'empresa-demo' }) }))
vi.mock('../../../app/access/AccessProvider', () => ({ useAccess: () => ({ can: () => true }) }))
vi.mock('../api/ausenciasApi', () => ({ getMisAusencias: vi.fn(), getTiposAusencia: vi.fn(), solicitarAusencia: vi.fn(), subirComprobantePropio: vi.fn() }))

beforeEach(() => {
  vi.mocked(getMisAusencias).mockResolvedValue([])
  vi.mocked(getTiposAusencia).mockResolvedValue([{ id: 'tipo-1', codigo: 'MED', nombre: 'Permiso médico', es_remunerado: true, descuenta_vacacion: false, requiere_documento: false, activo: true, dias_maximos_anio: null }])
  vi.mocked(solicitarAusencia).mockResolvedValue({ id: 'sol-1', estado: 'PENDIENTE' })
  vi.mocked(subirComprobantePropio).mockResolvedValue({ id: 'documento-1' })
})

it('adjunta comprobante cuando el tipo de ausencia lo requiere', async () => {
  const user = userEvent.setup()
  vi.mocked(getTiposAusencia).mockResolvedValueOnce([{ id: 'tipo-medico', codigo: 'LICENCIA_MEDICA', nombre: 'Licencia médica', es_remunerado: true, descuenta_vacacion: false, requiere_documento: true, activo: true, dias_maximos_anio: null }])
  render(<MisAusenciasPage />)
  await user.selectOptions(await screen.findByLabelText('Tipo de ausencia'), 'tipo-medico')
  fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-11-03' } })
  fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2026-11-03' } })
  await user.type(screen.getByLabelText('Motivo'), 'Consulta médica')
  const file = new File(['%PDF-demo'], 'comprobante.pdf', { type: 'application/pdf' })
  await user.upload(screen.getByLabelText(/Comprobante médico/), file)
  fireEvent.submit(screen.getByRole('button', { name: 'Solicitar ausencia' }).closest('form')!)
  await waitFor(() => expect(subirComprobantePropio).toHaveBeenCalledWith(file))
  await waitFor(() => expect(solicitarAusencia).toHaveBeenCalledWith(expect.objectContaining({ documento_id: 'documento-1' })))
})
afterEach(() => { cleanup(); vi.clearAllMocks() })

it('permite al empleado solicitar una ausencia y consultar su historial', async () => {
  const user = userEvent.setup()
  render(<MisAusenciasPage />)
  await screen.findByText('Todavía no tienes solicitudes de ausencia.')
  await user.selectOptions(screen.getByLabelText('Tipo de ausencia'), 'tipo-1')
  await user.type(screen.getByLabelText('Motivo'), 'Consulta médica')
  fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-11-03' } })
  fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2026-11-03' } })
  await user.click(screen.getByRole('button', { name: 'Solicitar ausencia' }))
  await waitFor(() => expect(solicitarAusencia).toHaveBeenCalledWith({
    tipo_ausencia_id: 'tipo-1', fecha_inicio: '2026-11-03', fecha_fin: '2026-11-03', motivo: 'Consulta médica',
  }))
})
