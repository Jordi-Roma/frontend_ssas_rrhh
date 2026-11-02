import { useCallback, useState, type FormEvent } from 'react'
import { useCompanyScope } from '../../../app/context/CompanyScopeContext'
import { Alert, Button, DataTable, EmptyState, Field, LoadingBlock, PageHeader, Panel } from '../../../shared/components'
import { useAsyncResource } from '../../../shared/hooks/useAsyncResource'
import { abrirPeriodo, aprobarPeriodo, calcularPeriodo, getPeriodos, type Periodo } from '../api/periodosApi'

export function PeriodosNominaPage() {
  const { selectedCompanyId } = useCompanyScope()
  if (!selectedCompanyId) return <EmptyState title="Selecciona una empresa" />

  return <Periodos empresaId={selectedCompanyId} />
}

function Periodos({ empresaId }: { empresaId: string }) {
  const load = useCallback(() => getPeriodos(empresaId), [empresaId])
  const resource = useAsyncResource(load)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [gestion, setGestion] = useState(new Date().getFullYear())
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [opening, setOpening] = useState(false)

  async function abrir(event: FormEvent) {
    event.preventDefault()
    setOpening(true); setError(null)
    try {
      await abrirPeriodo(gestion, mes, empresaId)
      resource.reload()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo abrir el periodo de nómina.')
    } finally { setOpening(false) }
  }

  async function accion(periodoId: string, tipo: 'calcular' | 'aprobar') {
    setBusyId(periodoId)
    setError(null)
    try {
      if (tipo === 'calcular') await calcularPeriodo(periodoId, empresaId)
      else await aprobarPeriodo(periodoId, empresaId)
      resource.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo completar la acción')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="page-stack">
      <PageHeader title="Periodos de nómina" eyebrow="Nómina" description="Abrir, calcular y aprobar periodos." />

      <Panel title="Abrir periodo de nómina">
        <p className="text-muted">Elige el mes a liquidar. Las vigencias de parámetros legales se configuran aparte en Empresa → Configuración.</p>
        <form className="filters" onSubmit={event => void abrir(event)}>
          <Field label="Gestión"><input type="number" min="2000" max="2100" value={gestion} onChange={event => setGestion(Number(event.target.value))} required /></Field>
          <Field label="Mes"><select value={mes} onChange={event => setMes(Number(event.target.value))}>{Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>{new Intl.DateTimeFormat('es', { month: 'long' }).format(new Date(2026, index, 1))}</option>)}</select></Field>
          <div className="filters-actions"><Button type="submit" loading={opening}>Abrir periodo</Button></div>
        </form>
      </Panel>

      {resource.loading && <LoadingBlock message="Cargando periodos…" />}
      {resource.error && <Alert tone="error">{resource.error}</Alert>}
      {error && <Alert tone="error">{error}</Alert>}

      {!resource.loading && !resource.error && (resource.data?.length ?? 0) === 0 && (
        <EmptyState title="No hay periodos" />
      )}

      <DataTable<Periodo>
        rows={resource.data ?? []}
        rowKey={p => p.id}
        columns={[
          { key: 'periodo', header: 'Periodo', render: p => `${p.gestion}-${String(p.mes).padStart(2, '0')}` },
          { key: 'estado', header: 'Estado', render: p => p.estado },
          {
            key: 'acciones',
            header: 'Acciones',
            render: p => (
              <div className="row-actions">
                {p.estado !== 'APROBADO' && (
                  <Button size="sm" loading={busyId === p.id} onClick={() => accion(p.id, 'calcular')}>
                    Calcular
                  </Button>
                )}
                {p.estado === 'CALCULADO' && (
                  <Button size="sm" variant="secondary" loading={busyId === p.id} onClick={() => accion(p.id, 'aprobar')}>
                    Aprobar
                  </Button>
                )}
              </div>
            ),
          },
        ]}
      />
    </div>
  )
}
