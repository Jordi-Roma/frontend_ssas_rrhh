import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { ayudaApi } from '../api/ayudaApi'
import { AyudaPage } from './AyudaPage'

vi.mock('../api/ayudaApi', () => ({ ayudaApi: { topics: vi.fn(), ask: vi.fn(), explain: vi.fn() } }))
vi.mock('../../../app/access/AccessProvider', () => ({ useAccess: () => ({ can: () => false }) }))
vi.mock('../../auth/hooks/useAuth', () => ({ useAuth: () => ({ user: null }) }))

beforeEach(() => {
  vi.mocked(ayudaApi.topics).mockResolvedValue([{ id: 'importacion', titulo: 'Importar catálogos', ruta: '/importaciones' }])
  vi.mocked(ayudaApi.ask).mockResolvedValue({ respuesta: 'Guía local', fuentes: [], modo: 'guia' })
  vi.mocked(ayudaApi.explain).mockResolvedValue({ respuesta: 'Explicación', fuentes: [], modo: 'ia' })
})
afterEach(() => { cleanup(); vi.clearAllMocks() })

it('keeps free-form questions local and sends only a fixed article ID to the AI action', async () => {
  render(<MemoryRouter><AyudaPage /></MemoryRouter>)
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Tu pregunta'), '¿Cómo importo datos?')
  await user.click(screen.getByRole('button', { name: 'Preguntar' }))
  expect(ayudaApi.ask).toHaveBeenCalledWith('¿Cómo importo datos?')
  expect(ayudaApi.explain).not.toHaveBeenCalled()
  await user.click(await screen.findByRole('button', { name: 'Explicar Importar catálogos con IA' }))
  expect(ayudaApi.explain).toHaveBeenCalledWith('importacion')
  expect(ayudaApi.ask).toHaveBeenCalledTimes(1)
  expect(await screen.findByText('Respuesta asistida por IA')).toBeInTheDocument()
})
