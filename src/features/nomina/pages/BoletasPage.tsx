import { useCallback, useState } from 'react'
import type { components } from '../../../shared/api/schema'
import { useAccess } from '../../../app/access/AccessProvider'
import { useCompanyScope } from '../../../app/context/CompanyScopeContext'
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
  if (!can('boletas:ver', 'platform:boletas:ver')) return <Alert tone="info">Necesitas permiso para consultar boletas de pago.</Alert>
  return <Boletas key={selectedCompanyId} empresaId={selectedCompanyId} empresa={company} />
}

function Boletas({ empresaId, empresa }: { empresaId: string; empresa: components['schemas']['EmpresaResponse'] | null }) {
  const { can } = useAccess()
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
    {!resource.loading && !resource.error && resource.data?.length === 0 && <><EmptyState title="No hay periodos de nómina" message="La vigencia de parámetros legales no abre un periodo de nómina. Primero abre el mes en Periodos de nómina y luego calcúlalo." />{can('nomina:gestionar', 'platform:nomina:gestionar') && <p><a href="/nomina/periodos">Ir a Periodos de nómina</a></p>}</>}
    {!resource.loading && !resource.error && (resource.data?.length ?? 0) > 0 && !periodo && <EmptyState title="Selecciona un periodo" message="Elige el mes de nómina que deseas consultar." />}
    {periodo && <BoletasPeriodo key={periodo.id} periodo={periodo} empresaId={empresaId} empresa={empresa} />}
  </div>
}

function BoletasPeriodo({ periodo, empresaId, empresa }: { periodo: Periodo; empresaId: string; empresa: components['schemas']['EmpresaResponse'] | null }) {
  const load = useCallback(() => getBoletasDePeriodo(periodo.id, empresaId), [periodo.id, empresaId])
  const resource = useAsyncResource(load)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<ResumenBoleta | null>(null)

  const query = search.trim().toLocaleLowerCase('es')
  const rows = (resource.data ?? []).filter(item =>
    !query || `${item.empleado_codigo} ${item.empleado_nombre}`.toLocaleLowerCase('es').includes(query))
  return <>
    {periodo.estado !== 'APROBADO' && <Alert tone="info">Este periodo está {periodo.estado} y todavía no está aprobado. Las boletas son provisionales.</Alert>}
    <div className="filters"><Field label="Buscar empleado"><input type="search" value={search} placeholder="Nombre o código" onChange={event => setSearch(event.target.value)} /></Field></div>
    <DataTable<ResumenBoleta> rows={rows} rowKey={item => item.id} loading={resource.loading} error={resource.error} onRetry={resource.reload} caption="Boletas del periodo" emptyMessage={query ? 'No hay coincidencias.' : 'No hay boletas para este periodo.'} columns={[
      { key: 'codigo', header: 'Código', render: item => item.empleado_codigo },
      { key: 'empleado', header: 'Empleado', render: item => item.empleado_nombre },
      { key: 'liquido', header: 'Líquido pagable', align: 'right', render: item => <strong>Bs {formatearBs(item.liquido_pagable)}</strong> },
      { key: 'acciones', header: 'Acciones', render: item => <Button size="sm" variant="secondary" onClick={() => setSelected(item)}>Ver boleta</Button> },
    ]} />
    {selected && <BoletaConsulta key={selected.id} boletaId={selected.id} empresaId={empresaId} empresa={empresa} nombreEmpleado={`${selected.empleado_codigo} — ${selected.empleado_nombre}`} periodo={periodo} onClose={() => setSelected(null)} />}
  </>
}
