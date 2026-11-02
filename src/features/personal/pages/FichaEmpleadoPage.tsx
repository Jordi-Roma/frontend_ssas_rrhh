import { useCallback, useState } from 'react'
import { BriefcaseBusiness, FileText, UserRound } from 'lucide-react'
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
      <section className="panel legajo-selector" aria-label="Seleccionar empleado">
        <div className="legajo-selector-heading"><span className="legajo-selector-icon"><UserRound size={22} aria-hidden="true" /></span><div><h2>Expediente personal</h2><p>Seleccioná un empleado para consultar su información.</p></div></div>
        <EmpleadoPicker empresaId={selectedCompanyId} value={empleadoId ?? null} soloActivos={false} onChange={id => navigate(id ? `/personal/ficha/${id}` : '/personal/ficha')} />
      </section>
      {!empleadoId ? <EmptyState title="Selecciona un empleado" message="Elegí una persona para abrir su legajo." /> : <section className="legajo-content" aria-label="Contenido del legajo">
        <div className="tabs legajo-tabs" role="tablist" aria-label="Secciones del legajo">
          <button className={`tab${tab === 'datos' ? ' selected' : ''}`} role="tab" aria-selected={tab === 'datos'} onClick={() => setTab('datos')}><UserRound size={17} aria-hidden="true" />Datos personales</button>
          <button className={`tab${tab === 'contratos' ? ' selected' : ''}`} role="tab" aria-selected={tab === 'contratos'} onClick={() => setTab('contratos')}><BriefcaseBusiness size={17} aria-hidden="true" />Contratos</button>
          <button className={`tab${tab === 'documentos' ? ' selected' : ''}`} role="tab" aria-selected={tab === 'documentos'} onClick={() => setTab('documentos')}><FileText size={17} aria-hidden="true" />Documentos</button>
        </div>
        <div role="tabpanel" className="legajo-tab-content">
          {tab === 'datos' && <DatosTab empleadoId={empleadoId} empresaId={selectedCompanyId} />}
          {tab === 'contratos' && <ContratosTab empleadoId={empleadoId} empresaId={selectedCompanyId} />}
          {tab === 'documentos' && <DocumentosEmpleado empleadoId={empleadoId} empresaId={selectedCompanyId} />}
        </div>
      </section>}
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
