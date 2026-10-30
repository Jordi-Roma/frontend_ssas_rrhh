import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EntrevistaForm } from './EntrevistaForm'
import { crearEntrevista, type Entrevista } from '../api/entrevistasApi'

vi.mock('../api/entrevistasApi', async importOriginal => ({ ...await importOriginal<typeof import('../api/entrevistasApi')>(), crearEntrevista: vi.fn() }))
beforeEach(() => { vi.mocked(crearEntrevista).mockReset() })
afterEach(cleanup)
async function fill(url: string) {
  const user = userEvent.setup()
  await user.selectOptions(screen.getByLabelText('Postulación'), 'post-uuid')
  await user.selectOptions(screen.getByLabelText('Entrevistador'), 'user-uuid')
  fireEvent.change(screen.getByLabelText('Fecha y hora'), { target: { value: '2050-10-05T10:30' } })
  await user.type(screen.getByLabelText('Enlace de reunión'), url)
  return user
}
function form(saved = vi.fn()) { return <EntrevistaForm empresaId="tenant-uuid" entrevistadores={[{ id: 'user-uuid', nombre: 'Ana', rol: 'RRHH' }]} postulaciones={[{ id: 'post-uuid', nombre_postulante: 'Luis', vacante: 'Ingeniero' }]} onSaved={saved} onCancel={vi.fn()} /> }
describe('interview form validation', () => {
  it('rejects HTTP links before sending a virtual interview', async () => {
    render(form())
    const user = await fill('http://meet.example.test/room')
    await user.click(screen.getByRole('button', { name: 'Programar entrevista' }))
    expect(await screen.findByText('Ingresa un enlace HTTPS válido.')).toBeInTheDocument()
    expect(crearEntrevista).not.toHaveBeenCalled()
  })
  it('sends HTTPS, string identifiers, timezone and the scoped tenant', async () => {
    vi.mocked(crearEntrevista).mockResolvedValue({ id: 'interview-uuid' } as Entrevista)
    const saved = vi.fn().mockResolvedValue(undefined)
    render(form(saved))
    const user = await fill('https://meet.example.test/room')
    await user.click(screen.getByRole('button', { name: 'Programar entrevista' }))
    await waitFor(() => expect(saved).toHaveBeenCalledOnce())
    expect(crearEntrevista).toHaveBeenCalledWith(expect.objectContaining({ postulacion_id: 'post-uuid', entrevistador_id: 'user-uuid', enlace_reunion: 'https://meet.example.test/room', fecha_hora: new Date('2050-10-05T10:30').toISOString(), duracion_min: 45, lugar: '' }), 'tenant-uuid')
  })
})
