import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useCompanyScope } from '../../../app/context/CompanyScopeContext'
import { getEmpleado } from '../../../shared/api/empleadosApi'
import { Alert, EmptyState, LoadingBlock, PageHeader } from '../../../shared/components'
import { useAsyncResource } from '../../../shared/hooks/useAsyncResource'
import { DocumentosEmpleado } from '../components/DocumentosEmpleado'
import { ContratosTimeline } from '../components/ContratosTimeline'
import { getContratos } from '../api/contratosApi'
import { DatosEmpleado } from '../components/DatosEmpleado'

export function FichaEmpleadoPage() {
  const { empleadoId } = useParams<{ empleadoId: string }>()
  const { selectedCompanyId } = useCompanyScope()
  const [tab, setTab] = useState<'datos' | 'contratos' | 'documentos'>('datos')

  if (!empleadoId || !selectedCompanyId) {
    return <EmptyState title="Empleado no seleccionado" message="Selecciona un empleado para ver su ficha." />
  }

  return (
    <div className="page-stack">
      <PageHeader title="Ficha del empleado" eyebrow="Personal" />

      <div className="tabs">
        <button className={tab === 'datos' ? 'active' : ''} onClick={() => setTab('datos')}>Datos</button>
        <button className={tab === 'contratos' ? 'active' : ''} onClick={() => setTab('contratos')}>Contratos</button>
        <button className={tab === 'documentos' ? 'active' : ''} onClick={() => setTab('documentos')}>Documentos</button>
      </div>

      {tab === 'datos' && <DatosTab empleadoId={empleadoId} empresaId={selectedCompanyId} />}
      {tab === 'contratos' && <ContratosTab empleadoId={empleadoId} empresaId={selectedCompanyId} />}
      {tab === 'documentos' && <DocumentosEmpleado empleadoId={empleadoId} empresaId={selectedCompanyId} />}
    </div>
  )
}

function DatosTab({ empleadoId, empresaId }: { empleadoId: string; empresaId: string }) {
  const resource = useAsyncResource(() => getEmpleado(empleadoId, empresaId))
  if (resource.loading) return <LoadingBlock message="Cargando datos…" />
  if (resource.error) return <Alert tone="error">{resource.error}</Alert>
  if (!resource.data) return null
  return <DatosEmpleado empleado={resource.data} />
}

function ContratosTab({ empleadoId, empresaId }: { empleadoId: string; empresaId: string }) {
  const resource = useAsyncResource(() => getContratos(empleadoId, empresaId))
  if (resource.loading) return <LoadingBlock message="Cargando contratos…" />
  if (resource.error) return <Alert tone="error">{resource.error}</Alert>
  return <ContratosTimeline contratos={resource.data ?? []} cargos={[]} />
}