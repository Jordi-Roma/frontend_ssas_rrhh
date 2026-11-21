import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { capacitacionApi, type Curso, type Leccion } from '../api/capacitacionApi'
import { CursosPage } from './CursosPage'
import { listarHabilidades } from '../../habilidades/api/habilidadesApi'

const scope = vi.hoisted(() => ({ selectedCompanyId: 'empresa-1', loading: false, manage: true }))
vi.mock('../../../app/context/CompanyScopeContext', () => ({ useCompanyScope: () => scope }))
vi.mock('../../../app/access/AccessProvider', () => ({ useAccess: () => ({ can: () => scope.manage }) }))
vi.mock('../api/capacitacionApi', () => ({ capacitacionApi: { cursos: vi.fn(), crearCurso: vi.fn(), editarCurso: vi.fn(), publicarCurso: vi.fn(), borrarCurso: vi.fn(), lecciones: vi.fn(), crearLeccion: vi.fn(), editarLeccion: vi.fn(), borrarLeccion: vi.fn(), subirMaterial: vi.fn() } }))
vi.mock('../../habilidades/api/habilidadesApi', () => ({ listarHabilidades: vi.fn() }))
const course: Curso = { id: 'curso-1', titulo: 'Inducción', descripcion: '', categoria: 'Personal', duracion_horas: 2, es_obligatorio: true, imagen_url: null, instructor: 'RRHH', nota_minima: 70, habilidad_id: null, estado: 'BORRADOR' }
const lesson: Leccion = { id: 'leccion-1', curso_id: 'curso-1', titulo: 'Introducción', tipo: 'MANUAL', orden: 1, duracion_minutos: 15, contenido_url: null, contenido_texto: 'Bienvenidos' }
beforeEach(() => { vi.resetAllMocks(); scope.manage = true; vi.mocked(capacitacionApi.cursos).mockResolvedValue([]); vi.mocked(capacitacionApi.lecciones).mockResolvedValue([]); vi.mocked(listarHabilidades).mockResolvedValue([]) })
afterEach(cleanup)

describe('Cursos de capacitación', () => {
  it('asocia una habilidad real del catálogo al crear el curso', async () => {
    const user = userEvent.setup()
    vi.mocked(listarHabilidades).mockResolvedValue([{ id: '7eaf8767-4b95-4452-93b1-88d936ba963a', empresa_id: 'empresa-1', nombre: 'Liderazgo', categoria: null, descripcion: null, activo: true }])
    vi.mocked(capacitacionApi.crearCurso).mockResolvedValue(course)
    render(<MemoryRouter><CursosPage /></MemoryRouter>)
    await screen.findByRole('option', { name: 'Liderazgo' })
    await user.type(screen.getByLabelText('Título *'), 'Liderazgo')
    await user.selectOptions(screen.getByLabelText('Habilidad que acredita'), '7eaf8767-4b95-4452-93b1-88d936ba963a')
    await user.click(screen.getByRole('button', { name: 'Crear curso' }))
    await waitFor(() => expect(capacitacionApi.crearCurso).toHaveBeenCalledWith(expect.objectContaining({ habilidad_id: '7eaf8767-4b95-4452-93b1-88d936ba963a' }), 'empresa-1'))
    expect(listarHabilidades).toHaveBeenCalledWith('empresa-1')
  })
  it('crea un curso, agrega una lección y permite publicarlo cuando ya tiene contenido', async () => {
    const user = userEvent.setup()
    vi.mocked(capacitacionApi.crearCurso).mockResolvedValue(course)
    vi.mocked(capacitacionApi.cursos).mockResolvedValueOnce([]).mockResolvedValue([course])
    vi.mocked(capacitacionApi.lecciones).mockResolvedValueOnce([]).mockResolvedValue([lesson])
    vi.mocked(capacitacionApi.crearLeccion).mockResolvedValue(lesson)
    vi.mocked(capacitacionApi.publicarCurso).mockResolvedValue({ ...course, estado: 'PUBLICADO' })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<MemoryRouter><CursosPage /></MemoryRouter>)
    await user.type(screen.getByLabelText('Título *'), 'Inducción')
    await user.click(screen.getByRole('button', { name: 'Crear curso' }))
    expect(await screen.findByText(/Curso creado/)).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Agregar lección' })).toBeInTheDocument())
    await user.type(screen.getAllByLabelText('Título *')[1], 'Introducción')
    await user.selectOptions(screen.getByLabelText('Tipo'), 'MANUAL')
    await user.type(screen.getByLabelText('Contenido de texto (opcional)'), 'Bienvenidos')
    await user.click(screen.getByRole('button', { name: 'Agregar lección' }))
    expect(await screen.findByText('Lección guardada.')).toBeInTheDocument()
    expect(capacitacionApi.crearLeccion).toHaveBeenCalledWith('curso-1', expect.objectContaining({ tipo: 'MANUAL', contenido_texto: 'Bienvenidos' }), 'empresa-1')
    await user.click(screen.getByRole('button', { name: 'Publicar curso' }))
    expect(capacitacionApi.publicarCurso).toHaveBeenCalledWith('curso-1', 'empresa-1')
  })
  it('explica el catálogo vacío sin acceso de gestión', async () => {
    scope.manage = false
    render(<MemoryRouter><CursosPage /></MemoryRouter>)
    expect(await screen.findByText('Todavía no hay cursos')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Crear curso' })).not.toBeInTheDocument()
  })
})
