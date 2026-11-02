import { useCallback, useState } from 'react'
import { Download, FileText, UploadCloud } from 'lucide-react'
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
    <div className="legajo-documents">
      <Can permisos={['personal:gestionar', 'platform:personal:gestionar']}><form onSubmit={onSubmit} className="panel legajo-upload">
        <div className="legajo-section-heading"><span className="legajo-section-icon"><UploadCloud size={20} aria-hidden="true" /></span><div><h2>Agregar documento</h2><p>PDF, JPG o PNG · máximo 10 MB</p></div></div>
        <div className="legajo-upload-fields">
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
        </div>
        <Button type="submit" loading={uploading} disabled={!file}><UploadCloud size={16} aria-hidden="true" />Subir documento</Button>
      </form></Can>
      {error && <Alert tone="error">{error}</Alert>}
      <div className="panel legajo-document-list"><div className="legajo-section-heading"><span className="legajo-section-icon"><FileText size={20} aria-hidden="true" /></span><div><h2>Documentos guardados</h2><p>Archivos asociados a este empleado</p></div></div>
      {resource.error && <Alert tone="error">{resource.error}</Alert>}
      {resource.loading ? <LoadingBlock message="Cargando documentos…" /> : !resource.error && resource.data?.length === 0 ? <p className="legajo-empty-documents">Todavía no hay documentos en este legajo.</p> : !resource.error && (
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
    </div>
  )
}
