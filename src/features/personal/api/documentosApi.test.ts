import { describe, expect, it, vi } from 'vitest'
import { apiRequest, downloadFile } from '../../../shared/api/httpClient'
import { descargarDocumento, subirDocumento } from './documentosApi'

vi.mock('../../../shared/api/httpClient', () => ({
  apiRequest: vi.fn(),
  downloadFile: vi.fn(),
  buildQuery: (params: Record<string, string>) => `?${new URLSearchParams(params)}`,
}))

describe('documentos del legajo', () => {
  it('envía el tipo como parámetro y el archivo como formulario', async () => {
    const file = new File(['%PDF-'], 'contrato.pdf', { type: 'application/pdf' })
    await subirDocumento('empleado-1', file, 'CONTRATO', 'empresa-1')
    const [path, options] = vi.mocked(apiRequest).mock.calls.at(-1)!
    expect(path).toBe('/api/v1/personal/empleados/empleado-1/documentos?empresa_id=empresa-1&tipo=CONTRATO')
    expect(options?.method).toBe('POST')
    expect(options?.formData?.get('archivo')).toBe(file)
  })

  it('descarga un documento del empleado y empresa indicados', async () => {
    const documento = { id: 'doc-1', nombre: 'contrato.pdf', tipo: 'CONTRATO', fecha_carga: '2026-10-31T12:00:00Z', tamano_bytes: 5 }
    await descargarDocumento('empleado-1', documento, 'empresa-1')
    expect(downloadFile).toHaveBeenCalledWith(
      '/api/v1/personal/empleados/empleado-1/documentos/doc-1/descarga?empresa_id=empresa-1',
      'contrato.pdf',
    )
  })
})
