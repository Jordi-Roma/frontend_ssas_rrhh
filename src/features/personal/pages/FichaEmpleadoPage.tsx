import { useCallback, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useCompanyScope } from '../../../app/context/CompanyScopeContext'
import { getEmpleado } from '../../../shared/api/empleadosApi'
import { Alert, EmpleadoPicker, EmptyState, LoadingBlock, PageHeader } from '../../../shared/components'
import { useAsyncResource } from '../../../shared/hooks/useAsyncResource'
import { DocumentosEmpleado } from '../components/DocumentosEmpleado'
import { ContratosTimeline } from '../components/ContratosTimeline'
import { getContratos } from '../api/contratosApi'
import { DatosEmpleado } from '../components/DatosEmpleado'

export function FichaEmpleadoPage() {
  const { empleadoId } = useParams<{ empleadoId: string }>()
  const navigate = useNavigate()
  const { selectedCompanyId } = useCompanyScope()
  const [tab, setTab] = useState<'datos' | 'contratos' | 'documentos'>('datos')

  if (!selectedCompanyId) return <EmptyState title="Selecciona una empresa" message="Elige una empresa para consultar sus empleados." />

  return (
    <div className="page-stack">
      <PageHeader title="Legajo del empleado" eyebrow="Personal" description="Consulta datos, contratos y documentos de cada empleado." />
      <div className="filters"><EmpleadoPicker empresaId={selectedCompanyId} value={empleadoId ?? null} soloActivos={false} onChange={id => navigate(id ? `/personal/ficha/${id}` : '/personal/ficha')} /></div>
      {!empleadoId ? <EmptyState title="Selecciona un empleado" message="Elegí una persona para abrir su legajo." /> : <>

      <div className="tabs">
        <button className={tab === 'datos' ? 'active' : ''} onClick={() => setTab('datos')}>Datos</button>
        <button className={tab === 'contratos' ? 'active' : ''} onClick={() => setTab('contratos')}>Contratos</button>
        <button className={tab === 'documentos' ? 'active' : ''} onClick={() => setTab('documentos')}>Documentos</button>
      </div>

      {tab === 'datos' && <DatosTab empleadoId={empleadoId} empresaId={selectedCompanyId} />}
      {tab === 'contratos' && <ContratosTab empleadoId={empleadoId} empresaId={selectedCompanyId} />}
      {tab === 'documentos' && <DocumentosEmpleado empleadoId={empleadoId} empresaId={selectedCompanyId} />}
      </>}
    </div>
  )
}

function DatosTab({ empleadoId, empresaId }: { empleadoId: string; empresaId: string }) {
  const load = useCallback(() => getEmpleado(empleadoId, empresaId), [empleadoId, empresaId])
  const resource = useAsyncResource(load)
  if (resource.loading) return <LoadingBlock message="Cargando datos…" />
  if (resource.error) return <Alert tone="error">{resource.error}</Alert>
  if (!resource.data) return null
  return <DatosEmpleado empleado={resource.data} />
}

function ContratosTab({ empleadoId, empresaId }: { empleadoId: string; empresaId: string }) {
  const load = useCallback(() => getContratos(empleadoId, empresaId), [empleadoId, empresaId])
  const resource = useAsyncResource(load)
  if (resource.loading) return <LoadingBlock message="Cargando contratos…" />
  if (resource.error) return <Alert tone="error">{resource.error}</Alert>
  return <ContratosTimeline contratos={resource.data ?? []} cargos={[]} />
}
