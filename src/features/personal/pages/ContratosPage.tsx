import { useCallback, useState } from 'react'
import { Plus } from 'lucide-react'
import { Can } from '../../../app/access/AccessProvider'
import { useCompanyScope } from '../../../app/context/CompanyScopeContext'
import { getEmpleado, nombreCompleto } from '../../../shared/api/empleadosApi'
import { getCargos, getDepartamentos } from '../../../shared/api/organizacionCatalogosApi'
import { Alert, Button, EmpleadoPicker, EmptyState, LoadingBlock, PageHeader } from '../../../shared/components'
import { useAsyncResource } from '../../../shared/hooks/useAsyncResource'
import { getContratos } from '../api/contratosApi'
import { ContratoFormModal } from '../components/ContratoFormModal'
import { ContratosTimeline } from '../components/ContratosTimeline'
import { ContratoVigente } from '../components/ContratoVigente'

export function ContratosPage() {
  const { selectedCompanyId, loading } = useCompanyScope()
  if (loading) return <LoadingBlock message="Resolviendo empresa activa…" />
  if (!selectedCompanyId) return <EmptyState title="Selecciona una empresa" message="Elige una empresa para consultar sus contratos." />
  return <Contratos key={selectedCompanyId} empresaId={selectedCompanyId} />
}

function Contratos({ empresaId }: { empresaId: string }) {
  const [empleadoId, setEmpleadoId] = useState<string | null>(null)
  return <div className="page-stack">
    <PageHeader title="Contratos" eyebrow="Personal" description="Ascensos, aumentos y cambios de cargo. Cada cambio crea una versión y conserva el historial." />
    <div className="filters"><EmpleadoPicker empresaId={empresaId} value={empleadoId} onChange={setEmpleadoId} soloActivos={false} /></div>
    {empleadoId ? <Historial key={empleadoId} empresaId={empresaId} empleadoId={empleadoId} /> : <EmptyState title="Selecciona un empleado para ver su historial" message="Consulta el contrato vigente y sus versiones anteriores." />}
  </div>
}

function Historial({ empresaId, empleadoId }: { empresaId: string; empleadoId: string }) {
  const load = useCallback(() => getContratos(empleadoId, empresaId), [empleadoId, empresaId])
  const loadCatalog = useCallback(() => Promise.all([getCargos(empresaId), getDepartamentos(empresaId), getEmpleado(empleadoId, empresaId)]), [empresaId, empleadoId])
  const resource = useAsyncResource(load)
  const catalog = useAsyncResource(loadCatalog)
  const [modal, setModal] = useState(false)
  const [success, setSuccess] = useState(false)
  const empleado = catalog.data?.[2]
  const contratos = resource.data ?? []
  const vigente = contratos.find(item => item.estado === 'VIGENTE')
  const current = vigente ?? contratos[0]
  const alta = <Can permisos={['personal:gestionar', 'platform:personal:gestionar']}><Button disabled={!empleado || empleado.estado !== 'ACTIVO' || resource.loading || resource.error !== null} onClick={() => { setSuccess(false); setModal(true) }}><Plus size={16} aria-hidden="true" />{contratos.length ? 'Nueva versión' : 'Registrar contrato'}</Button></Can>

  return <>
    <div className="panel-heading"><div>{empleado && <><strong>{empleado.codigo} — {nombreCompleto(empleado)}</strong><p className="text-muted">Estado del empleado: {empleado.estado}</p></>}</div>{alta}</div>
    {success && <Alert tone="success">Versión registrada. El historial se vuelve a consultar al servidor.</Alert>}
    {catalog.error && <Alert tone="error">No se pudieron resolver los datos del empleado y sus puestos. {catalog.error}<Button variant="secondary" onClick={catalog.reload}>Reintentar catálogos</Button></Alert>}
    {resource.loading ? <LoadingBlock message="Cargando historial de contratos…" /> : resource.error ? <Alert tone="error">{resource.error}<Button variant="secondary" onClick={resource.reload}>Reintentar contratos</Button></Alert> : contratos.length === 0 ? <EmptyState title="Este empleado todavía no tiene contratos registrados" message="Registra el contrato inicial para que la nómina pueda calcular su boleta." /> : <>
      {current && <ContratoVigente contrato={current} cargos={catalog.data?.[0] ?? []} departamentos={catalog.data?.[1] ?? []} empresaId={empresaId} />}
      <ContratosTimeline contratos={contratos} cargos={catalog.data?.[0] ?? []} />
    </>}
    {modal && empleado && <ContratoFormModal empleado={empleado} empresaId={empresaId} vigente={vigente} onClose={() => setModal(false)} onCreated={() => { setModal(false); setSuccess(true); resource.reload() }} />}
  </>
}
