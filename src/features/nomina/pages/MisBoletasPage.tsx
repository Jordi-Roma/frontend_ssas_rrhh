import { useCallback, useState } from 'react'
import { useAccess } from '../../../app/access/AccessProvider'
import { useCompanyScope } from '../../../app/context/CompanyScopeContext'
import { Alert, Button, DataTable, PageHeader } from '../../../shared/components'
import { useAsyncResource } from '../../../shared/hooks/useAsyncResource'
import { formatearBs, nombrePeriodo } from '../../../shared/utils/formato'
import { getMisBoletas, getPeriodos, type MiResumenBoleta } from '../api/nominaApi'
import { BoletaConsulta } from '../components/BoletaConsulta'

export function MisBoletasPage({ empresaId, nombreEmpleado }: { empresaId: string; nombreEmpleado: string }) {
  return <MisBoletas key={`${empresaId}:${nombreEmpleado}`} empresaId={empresaId} nombreEmpleado={nombreEmpleado} />
}

function MisBoletas({ empresaId, nombreEmpleado }: { empresaId: string; nombreEmpleado: string }) {
  const { company } = useCompanyScope()
  const { can } = useAccess()
  const canReadPeriods = can('nomina:ver', 'platform:nomina:ver')
  const loadPeriods = useCallback(() => canReadPeriods ? getPeriodos(empresaId) : Promise.resolve([]), [canReadPeriods, empresaId])
  const periodos = useAsyncResource(loadPeriods)
  const resource = useAsyncResource(getMisBoletas)
  const [selected, setSelected] = useState<MiResumenBoleta | null>(null)
  function periodoNombre(id: string) {
    const periodo = periodos.data?.find(item => item.id === id)
    return periodo ? nombrePeriodo(periodo.gestion, periodo.mes) : `Periodo · ref. ${id}`
  }
  return <div className="page-stack">
    <PageHeader title="Mis boletas" eyebrow="Mi cuenta" description="Consulta e imprime tus boletas de pago aprobadas." />
    {periodos.error && <Alert tone="error">No se pudieron consultar las fechas de los periodos. {periodos.error}<Button variant="secondary" onClick={periodos.reload}>Reintentar periodos</Button></Alert>}
    <DataTable<MiResumenBoleta> rows={resource.data ?? []} rowKey={item => item.id} loading={resource.loading} error={resource.error} onRetry={resource.reload} emptyMessage="Todavía no tienes boletas aprobadas." caption="Mis boletas aprobadas" columns={[
      { key: 'periodo', header: 'Periodo', render: item => periodoNombre(item.periodo_id) },
      { key: 'liquido', header: 'Líquido pagable', align: 'right', render: item => <strong>Bs {formatearBs(item.liquido_pagable)}</strong> },
      { key: 'acciones', header: 'Acciones', render: item => <Button variant="secondary" size="sm" onClick={() => setSelected(item)}>Ver boleta</Button> },
    ]} />
    {selected && <BoletaConsulta key={selected.id} boletaId={selected.id} empresaId={empresaId} empresa={company} nombreEmpleado={nombreEmpleado} periodo={periodos.data?.find(item => item.id === selected.periodo_id)} propia onClose={() => setSelected(null)} />}
  </div>
}
