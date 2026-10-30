import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { SeleccionPage } from './SeleccionPage'
import { getRanking, compararCandidatos, getVacantesSeleccion, type RankingCandidato } from '../api/seleccionApi'

const scope = vi.hoisted(() => ({ selectedCompanyId: 'empresa-a', allowed: true }))
vi.mock('../../../app/context/CompanyScopeContext', () => ({ useCompanyScope: () => scope }))
vi.mock('../../../app/access/AccessProvider', () => ({ useAccess: () => ({ can: () => scope.allowed }) }))
vi.mock('../../tablero/api/tableroApi', () => ({ getEtapas: vi.fn().mockResolvedValue([]), getPostulaciones: vi.fn().mockResolvedValue([]) }))
vi.mock('../../tablero/components/PostulanteDetalleModal', () => ({ PostulanteDetalleModal: () => null }))
vi.mock('../api/seleccionApi', () => ({ getRanking: vi.fn(), compararCandidatos: vi.fn(), getVacantesSeleccion: vi.fn().mockResolvedValue([{ id: 'vacante', titulo: 'Ingeniería', habilidades: [] }, { id: 'vacante-b', titulo: 'Ventas', habilidades: [] }]), getAnalisis: vi.fn().mockResolvedValue([]) }))
function page() { return <MemoryRouter initialEntries={['/vacantes/vacante/seleccion']}><Routes><Route path="/vacantes/:id/seleccion" element={<SeleccionPage />} /></Routes></MemoryRouter> }
function candidate(id: string, nombre: string) { return { id, postulante_id: id, nombre_postulante: nombre, estado: 'ACTIVA', puntaje_ia: null, puntaje_manual: null, puntaje_entrevistas: null, puntaje_evaluaciones: null, experiencia_anios: 2, educacion: 'TECNICO', habilidades_detectadas: [], habilidades_faltantes: [], entrevistas: [], evaluaciones: [] } as RankingCandidato }
beforeEach(() => { scope.selectedCompanyId = 'empresa-a'; scope.allowed = true; vi.mocked(getRanking).mockReset(); vi.mocked(compararCandidatos).mockReset(); vi.mocked(getVacantesSeleccion).mockClear() })
afterEach(cleanup)
describe('selection workflow', () => {
  it('ignores late tenant responses and clears prior selections on company change', async () => {
    let resolveA!: (value: { items: RankingCandidato[]; total: number }) => void
    vi.mocked(getRanking).mockImplementation((_id, company) => company === 'empresa-a' ? new Promise(resolve => { resolveA = resolve }) : Promise.resolve({ items: [candidate('b', 'Empresa B')], total: 1 }))
    const view = render(page())
    await waitFor(() => expect(getRanking).toHaveBeenCalled())
    scope.selectedCompanyId = 'empresa-b'; view.rerender(page())
    expect(await screen.findByText('Empresa B')).toBeInTheDocument()
    await act(async () => resolveA({ items: [candidate('a', 'Empresa A secreta')], total: 1 }))
    expect(screen.queryByText('Empresa A secreta')).not.toBeInTheDocument()
    const user = userEvent.setup(); await user.click(screen.getByLabelText('Comparar a Empresa B'))
    expect(screen.getByRole('button', { name: 'Comparar (1/4)' })).toBeDisabled()
    scope.selectedCompanyId = 'empresa-c'; view.rerender(page())
    await screen.findByText('Empresa B')
    expect(screen.getByRole('button', { name: 'Comparar (0/4)' })).toBeDisabled()
  })
  it('limits comparison to four candidates and preserves selection when closing it', async () => {
    const candidates = [1, 2, 3, 4, 5].map(n => candidate(String(n), `Candidato ${n}`))
    vi.mocked(getRanking).mockResolvedValue({ items: candidates, total: 5 }); vi.mocked(compararCandidatos).mockResolvedValue(candidates.slice(0, 4))
    render(page()); await screen.findByText('Candidato 1')
    const user = userEvent.setup()
    for (let n = 1; n <= 4; n++) await user.click(screen.getByLabelText(`Comparar a Candidato ${n}`))
    expect(screen.getByLabelText('Comparar a Candidato 5')).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Comparar (4/4)' }))
    await screen.findByRole('dialog', { name: 'Comparación de finalistas' })
    expect(compararCandidatos).toHaveBeenCalledWith('vacante', ['1', '2', '3', '4'], 'empresa-a')
    await user.keyboard('{Escape}')
    expect(screen.getByLabelText('Comparar a Candidato 1')).toBeChecked()
  })
  it('hides order categories without their read permission', async () => {
    scope.allowed = false; vi.mocked(getRanking).mockResolvedValue({ items: [], total: 0 })
    render(page())
    await screen.findByRole('option', { name: 'Ingeniería' })
    expect(screen.queryByRole('option', { name: 'Entrevistas' })).not.toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Evaluaciones' })).not.toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Afinidad de CV' })).toBeInTheDocument()
  })
  it('ignores a comparison that finishes after switching vacancies', async () => {
    let finish!: (items: RankingCandidato[]) => void
    vi.mocked(getRanking).mockImplementation(id => Promise.resolve({ items: id === 'vacante' ? [candidate('a', 'Ana'), candidate('b', 'Luis')] : [], total: id === 'vacante' ? 2 : 0 }))
    vi.mocked(compararCandidatos).mockImplementation(() => new Promise(resolve => { finish = resolve }))
    render(page())
    await screen.findByText('Ana')
    const user = userEvent.setup()
    await user.click(screen.getByLabelText('Comparar a Ana'))
    await user.click(screen.getByLabelText('Comparar a Luis'))
    await user.click(screen.getByRole('button', { name: 'Comparar (2/4)' }))
    await user.selectOptions(screen.getByLabelText('Vacante'), 'vacante-b')
    await act(async () => finish([candidate('a', 'Ana'), candidate('b', 'Luis')]))
    expect(screen.queryByRole('dialog', { name: 'Comparación de finalistas' })).not.toBeInTheDocument()
  })
})
