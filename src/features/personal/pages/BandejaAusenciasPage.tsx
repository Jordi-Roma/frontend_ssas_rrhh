import { useState } from 'react'
import { useCompanyScope } from '../../../app/context/CompanyScopeContext'
import { Alert, Button, DataTable, EmptyState, Field, LoadingBlock, PageHeader } from '../../../shared/components'
import { useAsyncResource } from '../../../shared/hooks/useAsyncResource'
import { decidirAusencia, getAusenciasEquipo, type SolicitudAusencia } from '../api/ausenciasJefeApi'

export function BandejaAusenciasPage() {
  const { selectedCompanyId } = useCompanyScope()
  if (!selectedCompanyId) return <EmptyState title="Selecciona una empresa" />

  return <Bandeja empresaId={selectedCompanyId} />
}

function Bandeja({ empresaId }: { empresaId: string }) {
  const resource = useAsyncResource(() => getAusenciasEquipo(empresaId))
  const [selected, setSelected] = useState<SolicitudAusencia | null>(null)
  const [observacion, setObservacion] = useState('')
  const [dias, setDias] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function decidir(decision: 'APROBAR' | 'RECHAZAR') {
    if (!selected) return
    setBusy(true)
    setError(null)
    try {
      await decidirAusencia(
        selected.id,
        decision,
        observacion,
        dias ? Number(dias) : undefined,
        empresaId,
      )
      setSelected(null)
      setObservacion('')
      setDias('')
      resource.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar la decisión')
    } finally {
      setBusy(false)
    }
  }

  const pendientes = (resource.data ?? []).filter(s => s.estado === 'PENDIENTE')

  return (
    <div className="page-stack">
      <PageHeader title="Bandeja de ausencias" eyebrow="Personal" description="Solicitudes pendientes de tu equipo." />

      {resource.loading && <LoadingBlock message="Cargando solicitudes…" />}
      {resource.error && <Alert tone="error">{resource.error}</Alert>}

      {!resource.loading && pendientes.length === 0 && (
        <EmptyState title="No hay solicitudes pendientes" />
      )}

      <DataTable<SolicitudAusencia>
        rows={pendientes}
        rowKey={s => s.id}
        columns={[
          { key: 'empleado', header: 'Empleado', render: s => s.empleado_id },
          { key: 'tipo', header: 'Tipo', render: s => s.tipo_ausencia },
          { key: 'fechas', header: 'Fechas', render: s => `${s.fecha_inicio} → ${s.fecha_fin}` },
          { key: 'accion', header: '', render: s => <Button size="sm" onClick={() => setSelected(s)}>Revisar</Button> },
        ]}
      />

      {selected && (
        <div className="panel">
          <h3>Decisión para {selected.tipo_ausencia}</h3>
          <Field label="Observación">
            <textarea value={observacion} onChange={e => setObservacion(e.target.value)} rows={3} />
          </Field>
          {selected.tipo_ausencia === 'VACACION' && (
            <Field label="Días hábiles">
              <input type="number" value={dias} onChange={e => setDias(e.target.value)} />
            </Field>
          )}
          {error && <Alert tone="error">{error}</Alert>}
          <div className="row-actions">
            <Button loading={busy} onClick={() => decidir('APROBAR')}>Aprobar</Button>
            <Button variant="secondary" loading={busy} onClick={() => decidir('RECHAZAR')}>Rechazar</Button>
            <Button variant="ghost" onClick={() => setSelected(null)}>Cancelar</Button>
          </div>
        </div>
      )}
    </div>
  )
}