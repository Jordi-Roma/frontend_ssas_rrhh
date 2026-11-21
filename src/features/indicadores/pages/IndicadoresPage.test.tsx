import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { indicadoresApi, type Indicadores } from '../api/indicadoresApi'
import { IndicadoresPage } from './IndicadoresPage'

vi.mock('../../../app/context/CompanyScopeContext', () => ({ useCompanyScope: () => ({ selectedCompanyId: 'empresa-1', loading: false }) }))
vi.mock('../api/indicadoresApi', () => ({ indicadoresApi: { obtener: vi.fn() } }))
const data: Indicadores = { empresa_id: 'empresa-1', desde: '2026-10-01', hasta: '2026-10-31', rotacion: { porcentaje: 5, salidas: 1, ingresos: 2, dotacion_inicial: 19, dotacion_final: 21 }, ausentismo: { porcentaje: 2.5, dias_habiles_ausentes: 10, dias_solicitados: 12, dias_habiles_posibles: 400 }, tiempo_promedio_contratacion: { dias: 12, contrataciones_medir: 2 }, headcount_por_departamento: [{ departamento_id: 'd1', departamento: 'Ventas', empleados: 8 }], embudo_reclutamiento: { POSTULADA: 4 }, embudo_por_etapa: [{ etapa_id: 'e1', etapa: 'Entrevista', orden: 1, postulaciones: 3 }] }
beforeEach(() => { vi.resetAllMocks(); vi.mocked(indicadoresApi.obtener).mockResolvedValue(data) })
afterEach(cleanup)

it('presenta los indicadores obtenidos y aplica un rango elegido a la empresa activa', async () => {
  render(<MemoryRouter><IndicadoresPage /></MemoryRouter>)
  expect(await screen.findByText('5.0%')).toBeInTheDocument()
  expect(screen.getByRole('img', { name: 'Ventas: 8' })).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-10-01' } })
  fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2026-10-31' } })
  fireEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }))
  await waitFor(() => expect(indicadoresApi.obtener).toHaveBeenCalledWith('empresa-1', '2026-10-01', '2026-10-31'))
})
it('distingue un error de un período sin datos', async () => {
  vi.mocked(indicadoresApi.obtener).mockRejectedValueOnce(new Error('Servicio no disponible')).mockResolvedValueOnce({ ...data, headcount_por_departamento: [], embudo_reclutamiento: {}, embudo_por_etapa: [] })
  render(<MemoryRouter><IndicadoresPage /></MemoryRouter>)
  expect(await screen.findByText('Servicio no disponible')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
  expect(await screen.findByText('No hay empleados por departamento para esta fecha.')).toBeInTheDocument()
})
