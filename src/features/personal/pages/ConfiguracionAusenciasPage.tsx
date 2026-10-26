import { Can } from '../../../app/access/AccessProvider'
import { useCompanyScope } from '../../../app/context/CompanyScopeContext'
import { EmptyState, LoadingBlock, PageHeader } from '../../../shared/components'
import { SaldoVacacionesForm } from '../components/SaldoVacacionesForm'
import { TiposAusenciaPanel } from '../components/TiposAusenciaPanel'

export function ConfiguracionAusenciasPage() {
  const { selectedCompanyId, loading } = useCompanyScope()
  if (loading) return <LoadingBlock message="Resolviendo empresa activa…" />
  if (!selectedCompanyId) return <EmptyState title="Selecciona una empresa" message="Elige una empresa para consultar sus ausencias y asignar vacaciones." />
  return <div className="page-stack" key={selectedCompanyId}>
    <PageHeader title="Configuración de ausencias" eyebrow="Personal" description="Tipos de ausencia activos y asignación de vacaciones por gestión." />
    <TiposAusenciaPanel empresaId={selectedCompanyId} />
    <Can permisos={['ausencias:gestionar', 'platform:ausencias:gestionar']}><SaldoVacacionesForm empresaId={selectedCompanyId} /></Can>
  </div>
}
