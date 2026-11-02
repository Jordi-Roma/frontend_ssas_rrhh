import { useCallback, useState, type FormEvent } from 'react'
import { useAccess } from '../../../app/access/AccessProvider'
import { useCompanyScope } from '../../../app/context/CompanyScopeContext'
import { Alert, Button, DataTable, EmptyState, Field, PageHeader, Panel } from '../../../shared/components'
import { useAsyncResource } from '../../../shared/hooks/useAsyncResource'
import { getMisAusencias, getTiposAusencia, solicitarAusencia, subirComprobantePropio, type MiAusencia } from '../api/ausenciasApi'

export function MisAusenciasPage() {
  const { selectedCompanyId } = useCompanyScope()
  const { can } = useAccess()
  const [tipoId, setTipoId] = useState('')
  const [inicio, setInicio] = useState('')
  const [fin, setFin] = useState('')
  const [motivo, setMotivo] = useState('')
  const [comprobante, setComprobante] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const loadTypes = useCallback(() => selectedCompanyId ? getTiposAusencia(selectedCompanyId) : Promise.resolve([]), [selectedCompanyId])
  const tipos = useAsyncResource(loadTypes)
  const ausencias = useAsyncResource(getMisAusencias)
  const tipoSeleccionado = tipos.data?.find(item => item.id === tipoId)

  if (!selectedCompanyId) return <EmptyState title="Selecciona una empresa" />

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!can('ausencias:solicitar')) return
    setError(null)
    setMessage(null)
    setSaving(true)
    try {
      let documentoId: string | undefined
      if (tipoSeleccionado?.requiere_documento) {
        if (!comprobante) { setError('Adjunta el comprobante requerido para esta ausencia.'); return }
        documentoId = (await subirComprobantePropio(comprobante)).id
      }
      await solicitarAusencia({ tipo_ausencia_id: tipoId, fecha_inicio: inicio, fecha_fin: fin, motivo: motivo.trim(), ...(documentoId ? { documento_id: documentoId } : {}) })
      setTipoId(''); setInicio(''); setFin(''); setMotivo(''); setComprobante(null)
      setMessage('Solicitud registrada. Puedes seguir su estado en el historial.')
      ausencias.reload()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo solicitar la ausencia.')
    } finally { setSaving(false) }
  }

  const nombres = new Map((tipos.data ?? []).map(item => [item.id, item.nombre]))
  return <div className="page-stack">
    <PageHeader title="Mis ausencias" eyebrow="Personal" description="Solicita una ausencia y consulta el estado de tus solicitudes." />
    {message && <Alert tone="success">{message}</Alert>}
    {can('ausencias:solicitar') && <Panel title="Nueva solicitud">
      <form className="form-stack" onSubmit={event => void submit(event)}>
        <Field label="Tipo de ausencia"><select value={tipoId} onChange={event => setTipoId(event.target.value)} required><option value="">Seleccionar tipo</option>{(tipos.data ?? []).map(item => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></Field>
        {tipos.error && <Alert tone="error">{tipos.error} <Button variant="secondary" onClick={tipos.reload}>Reintentar</Button></Alert>}
        <div className="form-grid"><Field label="Desde"><input type="date" value={inicio} onChange={event => setInicio(event.target.value)} required /></Field><Field label="Hasta"><input type="date" value={fin} onChange={event => setFin(event.target.value)} min={inicio || undefined} required /></Field></div>
        <Field label="Motivo"><textarea value={motivo} onChange={event => setMotivo(event.target.value)} required /></Field>
        {tipoSeleccionado?.requiere_documento && <Field label="Comprobante médico (PDF, JPG o PNG; máximo 10 MB)"><input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={event => setComprobante(event.target.files?.[0] ?? null)} required /></Field>}
        {error && <Alert tone="error">{error}</Alert>}
        <div className="form-actions"><Button type="submit" loading={saving} disabled={tipos.loading || !!tipos.error}>Solicitar ausencia</Button></div>
      </form>
    </Panel>}
    <Panel title="Mis solicitudes"><DataTable<MiAusencia> rows={ausencias.data ?? []} rowKey={item => item.id} loading={ausencias.loading} error={ausencias.error} onRetry={ausencias.reload} emptyMessage="Todavía no tienes solicitudes de ausencia." caption="Historial de ausencias" columns={[
      { key: 'tipo', header: 'Tipo', render: item => nombres.get(item.tipo_ausencia_id) ?? item.tipo_ausencia_id },
      { key: 'fecha', header: 'Fechas', render: item => `${item.fecha_inicio} a ${item.fecha_fin}` },
      { key: 'dias', header: 'Días', render: item => item.dias_solicitados },
      { key: 'estado', header: 'Estado', render: item => item.estado },
      { key: 'observacion', header: 'Observación', render: item => item.observacion_jefe ?? '—' },
    ]} /></Panel>
  </div>
}
