import { useState } from 'react'
import { Alert, Button, DataTable, Field, LoadingBlock } from '../../../shared/components'
import { useAsyncResource } from '../../../shared/hooks/useAsyncResource'
import { getDocumentos, subirDocumento, type Documento } from '../api/documentosApi'

export function DocumentosEmpleado({ empleadoId, empresaId }: { empleadoId: string; empresaId: string }) {
  const resource = useAsyncResource(() => getDocumentos(empleadoId, empresaId))
  const [file, setFile] = useState<File | null>(null)
  const [tipo, setTipo] = useState('CI')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
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
      <form onSubmit={onSubmit} className="filters">
        <Field label="Tipo">
          <select value={tipo} onChange={e => setTipo(e.target.value)}>
            <option value="CI">Cédula de identidad</option>
            <option value="CONTRATO">Contrato</option>
            <option value="OTRO">Otro</option>
          </select>
        </Field>
        <Field label="Archivo">
          <input type="file" onChange={e => setFile(e.target.files?.[0] ?? null)} />
        </Field>
        <Button type="submit" loading={uploading} disabled={!file}>Subir</Button>
      </form>
      {error && <Alert tone="error">{error}</Alert>}
      {resource.loading ? <LoadingBlock /> : (
        <DataTable<Documento>
          rows={resource.data ?? []}
          rowKey={d => d.id}
          columns={[
            { key: 'tipo', header: 'Tipo', render: d => d.tipo },
            { key: 'nombre', header: 'Archivo', render: d => d.nombre_archivo },
            { key: 'fecha', header: 'Fecha', render: d => d.fecha_registro },
          ]}
        />
      )}
    </div>
  )
}