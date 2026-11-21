import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { getEmpleados } from '../../../shared/api/empleadosApi'
import { getDepartamentos } from '../../../shared/api/organizacionCatalogosApi'
import { capacitacionApi, type Curso, type Inscripcion } from '../api/capacitacionApi'
import { SeguimientoCursosPage } from './SeguimientoCursosPage'

vi.mock('../../../app/context/CompanyScopeContext', () => ({ useCompanyScope: () => ({ selectedCompanyId: 'empresa-1', loading: false }) }))
vi.mock('../../../shared/api/empleadosApi', async original => ({ ...await original<typeof import('../../../shared/api/empleadosApi')>(), getEmpleados: vi.fn() }))
vi.mock('../../../shared/api/organizacionCatalogosApi', () => ({ getDepartamentos: vi.fn() }))
vi.mock('../api/capacitacionApi', () => ({ capacitacionApi: { cursos: vi.fn(), inscripciones: vi.fn(), asignar: vi.fn(), calificar: vi.fn() } }))
const course: Curso = { id: 'curso-1', titulo: 'Seguridad laboral', descripcion: '', categoria: 'Seguridad', duracion_horas: 1, es_obligatorio: true, imagen_url: null, instructor: null, nota_minima: 70, estado: 'PUBLICADO' }
const enrollment: Inscripcion = { id: 'inscripcion-1', curso_id: 'curso-1', empleado_id: 'empleado-1', progreso: 100, calificacion: null, estado: 'COMPLETADO', aprobado: false, fecha_limite: null, inscrito_en: '2026-11-17T10:00:00Z' }
beforeEach(() => { vi.resetAllMocks(); vi.mocked(capacitacionApi.cursos).mockResolvedValue([course]); vi.mocked(getDepartamentos).mockResolvedValue([{ id: 'departamento-1', nombre: 'Ventas' } as Awaited<ReturnType<typeof getDepartamentos>>[number]]); vi.mocked(getEmpleados).mockResolvedValue([]); vi.mocked(capacitacionApi.inscripciones).mockResolvedValue([]) })
afterEach(cleanup)

it('asigna un curso publicado por departamento y muestra el seguimiento devuelto por la API', async () => {
  vi.mocked(capacitacionApi.asignar).mockResolvedValue({ inscripciones: [enrollment], cantidad: 1 })
  vi.mocked(capacitacionApi.inscripciones).mockResolvedValueOnce([]).mockResolvedValue([enrollment])
  render(<MemoryRouter><SeguimientoCursosPage /></MemoryRouter>)
  const user = userEvent.setup()
  await user.click(await screen.findByLabelText('Departamento', { selector: 'input' }))
  await user.selectOptions(screen.getByLabelText('Departamento', { selector: 'select' }), 'departamento-1')
  await user.click(screen.getByRole('button', { name: 'Asignar curso' }))
  await waitFor(() => expect(capacitacionApi.asignar).toHaveBeenCalledWith({ curso_id: 'curso-1', departamento_id: 'departamento-1', fecha_limite: null }, 'empresa-1'))
  expect(await screen.findByText('1 inscripción creada.')).toBeInTheDocument()
  expect(screen.getByText('100%')).toBeInTheDocument()
})
