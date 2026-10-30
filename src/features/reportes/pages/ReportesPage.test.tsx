import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ReportesPage } from './ReportesPage'
import { reportesApi } from '../api/reportesApi'

vi.mock('../../../app/context/CompanyScopeContext', () => ({
  useCompanyScope: () => ({ company: { id: 'company-a' } }),
}))
vi.mock('../api/reportesApi', () => ({
  reportesApi: {
    catalog: vi.fn(), interpret: vi.fn(), preview: vi.fn(), create: vi.fn(), export: vi.fn(),
  },
  saveBlob: vi.fn(),
}))

const config = {
  fuente: 'postulaciones',
  columnas: ['postulante', 'fecha_postulacion'],
  filtros: [{ campo: 'fecha_postulacion', operador: 'mayor_igual' as const, valor: '2026-09-01' }],
  orden: [{ campo: 'fecha_postulacion', direccion: 'desc' as const }],
}

beforeEach(() => {
  vi.mocked(reportesApi.catalog).mockReset().mockResolvedValue([
    { codigo: 'postulaciones', nombre: 'Postulaciones', columnas: ['postulante', 'fecha_postulacion'] },
  ])
  vi.mocked(reportesApi.interpret).mockReset().mockResolvedValue({ config, aclaracion: null })
  vi.mocked(reportesApi.preview).mockReset().mockResolvedValue({
    columnas: config.columnas, items: [{ postulante: 'Ana', fecha_postulacion: '2026-09-15' }],
    total: 1, page: 1, per_page: 25,
  })
})
afterEach(() => {
  cleanup()
  delete (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition
})

describe('reportes por voz o texto', () => {
  it('shows the transcription and automatically previews the interpreted report', async () => {
    render(<ReportesPage />)
    fireEvent.change(screen.getByLabelText('Consulta por voz o texto'), {
      target: { value: 'Postulaciones de septiembre' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Generar reporte' }))

    await waitFor(() => expect(reportesApi.preview).toHaveBeenCalledOnce())
    expect(reportesApi.interpret).toHaveBeenCalledWith('Postulaciones de septiembre', 'company-a')
    expect(screen.getByDisplayValue('Postulaciones de septiembre')).toBeInTheDocument()
    expect(await screen.findByText('Ana')).toBeInTheDocument()
    expect(screen.getByText(/Propuesta interpretada/)).toBeInTheDocument()
  })

  it('hides the old preview while edited filters are recalculated', async () => {
    render(<ReportesPage />)
    fireEvent.change(screen.getByLabelText('Consulta por voz o texto'), {
      target: { value: 'Postulaciones de septiembre' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Generar reporte' }))
    expect(await screen.findByText('Ana')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Valor del filtro 1'), {
      target: { value: '2026-10-01' },
    })
    expect(screen.queryByText('Ana')).not.toBeInTheDocument()
    await waitFor(() => expect(reportesApi.preview).toHaveBeenCalledTimes(2))
    expect(reportesApi.preview).toHaveBeenLastCalledWith(
      expect.objectContaining({ filtros: [expect.objectContaining({ valor: '2026-10-01' })] }),
      'company-a',
    )
  })

  it('asks for clarification without running the report when interpretation is uncertain', async () => {
    vi.mocked(reportesApi.interpret).mockResolvedValue({
      config: null, aclaracion: 'Indica qué datos necesitas.',
    })
    render(<ReportesPage />)
    fireEvent.change(screen.getByLabelText('Consulta por voz o texto'), {
      target: { value: 'Muéstrame todo' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Generar reporte' }))
    expect(await screen.findByText('Indica qué datos necesitas.')).toBeInTheDocument()
    expect(reportesApi.preview).not.toHaveBeenCalled()
  })

  it('shows dictated text and automatically interprets it', async () => {
    let recognition: FakeRecognition | null = null
    class FakeRecognition {
      lang = ''
      continuous = false
      interimResults = false
      onresult: ((event: { resultIndex: number; results: { transcript: string }[][] }) => void) | null = null
      onerror = null
      onend: (() => void) | null = null
      constructor() { recognition = this }
      start() { /* The test delivers the transcript explicitly. */ }
      stop() { this.onend?.() }
    }
    Object.defineProperty(window, 'SpeechRecognition', {
      value: FakeRecognition, configurable: true,
    })

    render(<ReportesPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Dictar consulta' }))
    await act(async () => {
      recognition?.onresult?.({
        resultIndex: 0, results: [[{ transcript: 'Postulaciones de septiembre' }]],
      })
    })

    expect(screen.getByDisplayValue('Postulaciones de septiembre')).toBeInTheDocument()
    expect(reportesApi.interpret).toHaveBeenCalledWith('Postulaciones de septiembre', 'company-a')
    expect(await screen.findByText('Ana')).toBeInTheDocument()
  })
})

describe('filtros manuales de reportes', () => {
  const sources = [
    { codigo: 'vacantes', nombre: 'Vacantes', columnas: ['titulo', 'estado'] },
    { codigo: 'usuarios', nombre: 'Usuarios', columnas: ['nombres', 'username'] },
    { codigo: 'postulaciones', nombre: 'Postulaciones', columnas: ['postulante', 'estado'] },
  ]
  const cases = [
    ['vacantes', 'titulo'],
    ['usuarios', 'nombres'],
    ['postulaciones', 'postulante'],
  ] as const
  const operators = ['igual', 'contiene', 'mayor_igual', 'menor_igual'] as const

  it.each(cases.flatMap(([source, field]) => operators.map((operator) => [source, field, operator] as const)))(
    'envía %s con filtro %s %s',
    async (source, field, operator) => {
      vi.mocked(reportesApi.catalog).mockResolvedValue(sources)
      render(<ReportesPage />)
      await waitFor(() => expect(screen.getByRole('option', { name: 'Postulaciones' })).toBeInTheDocument())

      fireEvent.change(screen.getByLabelText('Fuente'), { target: { value: source } })
      fireEvent.click(screen.getByRole('checkbox', { name: field }))
      fireEvent.click(screen.getByRole('button', { name: 'Añadir filtro' }))
      fireEvent.change(screen.getByLabelText('Campo del filtro 1'), { target: { value: field } })
      fireEvent.change(screen.getByLabelText('Operador del filtro 1'), { target: { value: operator } })
      fireEvent.change(screen.getByLabelText('Valor del filtro 1'), { target: { value: 'Prueba' } })
      fireEvent.click(screen.getByRole('button', { name: 'Vista previa' }))

      await waitFor(() => expect(reportesApi.preview).toHaveBeenCalledWith({
        fuente: source,
        columnas: [field],
        filtros: [{ campo: field, operador: operator, valor: 'Prueba' }],
        orden: [],
      }, 'company-a'))
    },
  )
})
