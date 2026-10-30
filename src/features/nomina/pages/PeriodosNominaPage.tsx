import { useState } from 'react'
import { useCompanyScope } from '../../../app/context/CompanyScopeContext'
import { Alert, Button, DataTable, EmptyState, LoadingBlock, PageHeader } from '../../../shared/components'
import { useAsyncResource } from '../../../shared/hooks/useAsyncResource'
import { aprobarPeriodo, calcularPeriodo, getPeriodos, type Periodo } from '../api/periodosApi'

export function PeriodosNominaPage() {
  const { selectedCompanyId } = useCompanyScope()
  if (!selectedCompanyId) return <EmptyState title="Selecciona una empresa" />

  return <Periodos empresaId={selectedCompanyId} />
}

function Periodos({ empresaId }: { empresaId: string }) {
  const resource = useAsyncResource(() => getPeriodos(empresaId))
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

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

      {resource.loading && <LoadingBlock message="Cargando periodos…" />}
      {resource.error && <Alert tone="error">{resource.error}</Alert>}
      {error && <Alert tone="error">{error}</Alert>}

      {!resource.loading && (resource.data?.length ?? 0) === 0 && (
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