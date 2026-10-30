import { useCallback, useEffect, useRef, useState } from 'react'
import type { components } from '../../../shared/api/schema'
import { useAccess } from '../../../app/access/AccessProvider'
import { useCompanyScope } from '../../../app/context/CompanyScopeContext'
import { getEmpleados, nombreCompleto, type Empleado } from '../../../shared/api/empleadosApi'
import { Alert, Button, DataTable, EmptyState, Field, LoadingBlock, PageHeader } from '../../../shared/components'
import { useAsyncResource } from '../../../shared/hooks/useAsyncResource'
import { formatearBs, nombrePeriodo } from '../../../shared/utils/formato'
import { getBoletasDePeriodo, getPeriodos, type Periodo, type ResumenBoleta } from '../api/nominaApi'
import { BoletaConsulta } from '../components/BoletaConsulta'

export function BoletasPage() {
  const { selectedCompanyId, company, loading } = useCompanyScope()
  const { can } = useAccess()
  if (loading) return <LoadingBlock message="Resolviendo empresa activa…" />
  if (!selectedCompanyId) return <EmptyState title="Selecciona una empresa" message="Elige una empresa para consultar sus boletas de pago." />
  if (!can('nomina:ver', 'platform:nomina:ver')) return <Alert tone="info">Para elegir un periodo necesitas permiso de consulta de nómina. Solicítalo al administrador de tu empresa.</Alert>
  return <Boletas key={selectedCompanyId} empresaId={selectedCompanyId} empresa={company} />
}

function Boletas({ empresaId, empresa }: { empresaId: string; empresa: components['schemas']['EmpresaResponse'] | null }) {
  const load = useCallback(() => getPeriodos(empresaId), [empresaId])
  const resource = useAsyncResource(load)
  const [periodoId, setPeriodoId] = useState('')
  const periodo = resource.data?.find(item => item.id === periodoId) ?? null
  return <div className="page-stack">
    <PageHeader title="Boletas de pago" eyebrow="Nómina" description="Consulta e impresión de boletas por periodo." />
    <div className="filters"><Field label="Periodo"><select value={periodoId} disabled={resource.loading || resource.error !== null} onChange={event => setPeriodoId(event.target.value)}>
      <option value="">{resource.loading ? 'Cargando periodos…' : 'Seleccionar periodo'}</option>
      {resource.data?.map(item => <option key={item.id} value={item.id}>{nombrePeriodo(item.gestion, item.mes)} — {item.estado}</option>)}
    </select></Field></div>
    {resource.error && <Alert tone="error">{resource.error}<Button variant="secondary" onClick={resource.reload}>Reintentar periodos</Button></Alert>}
    {!resource.loading && !resource.error && resource.data?.length === 0 && <EmptyState title="No hay periodos de nómina" message="Las boletas estarán disponibles cuando se registre y calcule un periodo." />}
    {!resource.loading && !resource.error && (resource.data?.length ?? 0) > 0 && !periodo && <EmptyState title="Selecciona un periodo" message="Elige el mes de nómina que deseas consultar." />}
    {periodo && <BoletasPeriodo key={periodo.id} periodo={periodo} empresaId={empresaId} empresa={empresa} />}
  </div>
}

function BoletasPeriodo({ periodo, empresaId, empresa }: { periodo: Periodo; empresaId: string; empresa: components['schemas']['EmpresaResponse'] | null }) {
  const load = useCallback(async () => {
    const [boletas, empleados] = await Promise.all([getBoletasDePeriodo(periodo.id, empresaId), getEmpleados(empresaId, 0, 50)])
    return { boletas, empleados }
  }, [periodo.id, empresaId])
  const resource = useAsyncResource(load)
  const [extra, setExtra] = useState<Empleado[]>([])
  const [moreAvailable, setMoreAvailable] = useState(true)
  const [moreBusy, setMoreBusy] = useState(false)
  const [moreError, setMoreError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<ResumenBoleta | null>(null)
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  const empleados = new Map([...(resource.data?.empleados ?? []), ...extra].map(item => [item.id, item]))
  const hasMore = resource.data?.empleados.length === 50 && moreAvailable
  const missingNames = resource.data?.boletas.some(item => !empleados.has(item.empleado_id)) ?? false

  async function loadMore() {
    if (moreBusy) return
    setMoreBusy(true); setMoreError(null)
    try {
      const page = await getEmpleados(empresaId, 50 + extra.length, 50)
      if (alive.current) { setExtra(previous => [...previous, ...page]); setMoreAvailable(page.length === 50) }
    } catch (cause) {
      if (alive.current) setMoreError(cause instanceof Error ? cause.message : 'No se pudieron cargar más empleados.')
    } finally { if (alive.current) setMoreBusy(false) }
  }

  const query = search.trim().toLocaleLowerCase('es')
  const rows = (resource.data?.boletas ?? []).filter(item => {
    const empleado = empleados.get(item.empleado_id)
    return !query || `${empleado ? `${empleado.codigo} ${nombreCompleto(empleado)}` : item.empleado_id}`.toLocaleLowerCase('es').includes(query)
  })
  return <>
    {periodo.estado !== 'APROBADO' && <Alert tone="info">Este periodo está {periodo.estado} y todavía no está aprobado. Las boletas son provisionales.</Alert>}
    <div className="filters"><Field label="Buscar empleado"><input type="search" value={search} placeholder="Nombre o código" onChange={event => setSearch(event.target.value)} /></Field></div>
    {missingNames && !resource.error && <Alert tone="info">Algunos empleados todavía no están cargados. Puedes cargar más nombres o abrir su boleta para consultar su ficha. La búsqueda por nombre usa los empleados cargados.</Alert>}
    <DataTable<ResumenBoleta> rows={rows} rowKey={item => item.id} loading={resource.loading} error={resource.error} onRetry={resource.reload} caption="Boletas del periodo" emptyMessage={query ? 'No hay coincidencias entre los empleados cargados.' : 'No hay boletas para este periodo.'} columns={[
      { key: 'codigo', header: 'Código', render: item => empleados.get(item.empleado_id)?.codigo ?? 'Sin cargar' },
      { key: 'empleado', header: 'Empleado', render: item => { const employee = empleados.get(item.empleado_id); return employee ? nombreCompleto(employee) : `Empleado · ref. ${item.empleado_id}` } },
      { key: 'liquido', header: 'Líquido pagable', align: 'right', render: item => <strong>Bs {formatearBs(item.liquido_pagable)}</strong> },
      { key: 'acciones', header: 'Acciones', render: item => <Button size="sm" variant="secondary" onClick={() => setSelected(item)}>Ver boleta</Button> },
    ]} />
    {moreError && <Alert tone="error">{moreError}<Button variant="secondary" size="sm" onClick={() => void loadMore()}>Reintentar empleados</Button></Alert>}
    {hasMore && <div className="row-actions"><Button variant="secondary" loading={moreBusy} onClick={() => void loadMore()}>Cargar más empleados</Button><span className="text-muted">{empleados.size} empleados cargados</span></div>}
    {selected && <BoletaConsulta key={selected.id} boletaId={selected.id} empresaId={empresaId} empresa={empresa} empleado={empleados.get(selected.empleado_id)} periodo={periodo} onClose={() => setSelected(null)} />}
  </>
}
