import { useCallback, useState } from 'react'
import { Download } from 'lucide-react'
import { Can } from '../../../app/access/AccessProvider'
import { Alert, Button, DataTable, Field, LoadingBlock } from '../../../shared/components'
import { useAsyncResource } from '../../../shared/hooks/useAsyncResource'
import { descargarDocumento, getDocumentos, subirDocumento, type Documento } from '../api/documentosApi'

export function DocumentosEmpleado({ empleadoId, empresaId }: { empleadoId: string; empresaId: string }) {
  const load = useCallback(() => getDocumentos(empleadoId, empresaId), [empleadoId, empresaId])
  const resource = useAsyncResource(load)
  const [file, setFile] = useState<File | null>(null)
  const [tipo, setTipo] = useState('CI')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    if (file.size > 10 * 1024 * 1024 || !['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) {
      setError('Selecciona un PDF, JPG o PNG de hasta 10 MB.')
      return
    }
    setUploading(true)
    setError(null)
    try {
      await subirDocumento(empleadoId, file, tipo, empresaId)
      setFile(null)
      resource.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="stack">
      <Can permisos={['personal:gestionar', 'platform:personal:gestionar']}><form onSubmit={onSubmit} className="filters">
        <Field label="Tipo">
          <select value={tipo} onChange={e => setTipo(e.target.value)}>
            <option value="CI">Cédula de identidad</option>
            <option value="CONTRATO">Contrato</option>
            <option value="OTRO">Otro</option>
          </select>
        </Field>
        <Field label="Archivo">
          <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setFile(e.target.files?.[0] ?? null)} />
        </Field>
        <Button type="submit" loading={uploading} disabled={!file}>Subir</Button>
      </form></Can>
      {error && <Alert tone="error">{error}</Alert>}
      {resource.loading ? <LoadingBlock /> : (
        <DataTable<Documento>
          rows={resource.data ?? []}
          rowKey={d => d.id}
          columns={[
            { key: 'tipo', header: 'Tipo', render: d => d.tipo },
            { key: 'nombre', header: 'Archivo', render: d => d.nombre },
            { key: 'fecha', header: 'Fecha', render: d => new Date(d.fecha_carga).toLocaleString('es-BO') },
            { key: 'descargar', header: 'Acción', render: d => <Button size="sm" variant="ghost" onClick={() => void descargarDocumento(empleadoId, d, empresaId).catch(err => setError(err instanceof Error ? err.message : 'No se pudo descargar el archivo'))}><Download size={16} aria-hidden="true" />Descargar</Button> },
          ]}
        />
      )}
    </div>
  )
}
