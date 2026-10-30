import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EvaluacionForm } from './EvaluacionForm'
import { ApiError } from '../../../shared/api/httpClient'
import { guardarEvaluacion, type Evaluacion } from '../api/seleccionApi'

const auth = vi.hoisted(() => ({ realm: 'tenant' }))
vi.mock('../../auth/hooks/useAuth', () => ({ useAuth: () => ({ user: { realm: auth.realm } }) }))
vi.mock('../api/seleccionApi', () => ({ guardarEvaluacion: vi.fn(), getEvaluadores: vi.fn().mockResolvedValue([{ id: 'evaluator', nombre: 'Ana', rol: 'RRHH' }]) }))
beforeEach(() => { vi.mocked(guardarEvaluacion).mockReset(); auth.realm = 'tenant' })
afterEach(cleanup)
async function fill() { const user = userEvent.setup(); await user.type(screen.getByLabelText('Nombre'), 'Prueba técnica'); await user.type(screen.getByLabelText('Puntaje'), '85'); await user.selectOptions(screen.getByLabelText('Dictamen'), 'true'); return user }
describe('evaluation form', () => {
  it('keeps data and backend field errors when saving fails', async () => {
    vi.mocked(guardarEvaluacion).mockRejectedValue(new ApiError('Error de validación', 422, { nombre: 'Nombre inválido' }))
    const saved = vi.fn()
    render(<EvaluacionForm postulacionId="post" empresaId="tenant" onSaved={saved} />)
    const user = await fill(); await user.click(screen.getByRole('button', { name: /Guardar evaluación/ }))
    expect(await screen.findByText('Nombre inválido')).toBeInTheDocument()
    expect(screen.getByLabelText(/^Nombre/)).toHaveValue('Prueba técnica'); expect(saved).not.toHaveBeenCalled()
    expect(vi.mocked(guardarEvaluacion).mock.calls[0][1]).not.toHaveProperty('evaluador_id')
  })
  it('requires the platform evaluator selected from real scoped options', async () => {
    auth.realm = 'platform'; vi.mocked(guardarEvaluacion).mockResolvedValue({ id: 'eval' } as Evaluacion)
    render(<EvaluacionForm postulacionId="post" empresaId="tenant" onSaved={vi.fn()} />)
    await screen.findByRole('option', { name: 'Ana (RRHH)' })
    const user = await fill(); await user.selectOptions(screen.getByLabelText('Evaluador de la empresa'), 'evaluator'); await user.click(screen.getByRole('button', { name: /Guardar evaluación/ }))
    await waitFor(() => expect(guardarEvaluacion).toHaveBeenCalled())
    expect(vi.mocked(guardarEvaluacion).mock.calls[0][1]).toMatchObject({ aprobado: true, evaluador_id: 'evaluator', puntaje: 85, puntaje_maximo: 100 })
  })
  it('locks the original evaluator during a platform correction', async () => {
    auth.realm = 'platform'
    render(<EvaluacionForm postulacionId="post" empresaId="tenant" evaluacion={{ id: 'eval', evaluador_id: 'original', nombre: 'Original', puntaje: 20, puntaje_maximo: 30, aprobado: true, tipo: 'TECNICA', observaciones: '' } as Evaluacion} onSaved={vi.fn()} />)
    await screen.findByRole('option', { name: 'Ana (RRHH)' })
    expect(screen.getByLabelText('Evaluador de la empresa')).toBeDisabled(); expect(screen.getByLabelText('Evaluador de la empresa')).toHaveValue('original')
  })
})
