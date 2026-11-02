import { useCallback, useState } from 'react'
import { useCompanyScope } from '../../../app/context/CompanyScopeContext'
import { useAccess } from '../../../app/access/AccessProvider'
import { Alert, Button, DataTable, EmptyState, Field, LoadingBlock, PageHeader } from '../../../shared/components'
import { useAsyncResource } from '../../../shared/hooks/useAsyncResource'
import { decidirAusencia, getAusenciasEmpresa, getAusenciasEquipo, type SolicitudAusencia } from '../api/ausenciasJefeApi'
import { getTiposAusencia } from '../api/ausenciasApi'

export function BandejaAusenciasPage() {
  const { selectedCompanyId } = useCompanyScope()
  if (!selectedCompanyId) return <EmptyState title="Selecciona una empresa" />

  return <Bandeja empresaId={selectedCompanyId} />
}

function Bandeja({ empresaId }: { empresaId: string }) {
  const { can } = useAccess()
  const canManage = can('ausencias:gestionar', 'platform:ausencias:gestionar')
  const load = useCallback(() => canManage ? getAusenciasEmpresa(empresaId) : getAusenciasEquipo(empresaId), [canManage, empresaId])
  const loadTipos = useCallback(() => getTiposAusencia(empresaId), [empresaId])
  const resource = useAsyncResource(load)
  const tipos = useAsyncResource(loadTipos)
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
  const nombres = new Map((tipos.data ?? []).map(tipo => [tipo.id, tipo.nombre]))
  const vacaciones = new Set((tipos.data ?? []).filter(tipo => tipo.descuenta_vacacion).map(tipo => tipo.id))

  return (
    <div className="page-stack">
      <PageHeader title="Bandeja de ausencias" eyebrow="Personal" description="Solicitudes pendientes de tu equipo." />

      {resource.loading && <LoadingBlock message="Cargando solicitudes…" />}
      {resource.error && <Alert tone="error">{resource.error}</Alert>}

      {!resource.loading && !resource.error && pendientes.length === 0 && (
        <EmptyState title="No hay solicitudes pendientes" />
      )}

      <DataTable<SolicitudAusencia>
        rows={pendientes}
        rowKey={s => s.id}
        columns={[
          { key: 'empleado', header: 'Empleado', render: s => s.empleado_id },
          { key: 'tipo', header: 'Tipo', render: s => nombres.get(s.tipo_ausencia_id) ?? s.tipo_ausencia_id },
          { key: 'fechas', header: 'Fechas', render: s => `${s.fecha_inicio} → ${s.fecha_fin}` },
          { key: 'accion', header: '', render: s => <Button size="sm" onClick={() => setSelected(s)}>Revisar</Button> },
        ]}
      />

      {selected && (
        <div className="panel">
          <h3>Decisión para {nombres.get(selected.tipo_ausencia_id) ?? 'ausencia'}</h3>
          <Field label="Observación">
            <textarea value={observacion} onChange={e => setObservacion(e.target.value)} rows={3} />
          </Field>
          {vacaciones.has(selected.tipo_ausencia_id) && (
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
