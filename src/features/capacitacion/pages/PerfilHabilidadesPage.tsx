import { useCallback, useState } from 'react'
import { useCompanyScope } from '../../../app/context/CompanyScopeContext'
import { useAccess } from '../../../app/access/AccessProvider'
import { useAuth } from '../../auth/hooks/useAuth'
import { Alert, Button, EmpleadoPicker, EmptyState, LoadingBlock, PageHeader, Panel } from '../../../shared/components'
import { useAsyncResource } from '../../../shared/hooks/useAsyncResource'
import { capacitacionApi } from '../api/capacitacionApi'

export function PerfilHabilidadesPage() {
  const { selectedCompanyId } = useCompanyScope()
  const { can } = useAccess()
  const { user } = useAuth()
  const canViewOthers = can('capacitacion:gestionar', 'platform:capacitacion:gestionar')
  const canViewMine = user?.realm === 'tenant' && can('capacitacion:aprender')
  const [employeeId, setEmployeeId] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const load = useCallback(() => employeeId && selectedCompanyId
    ? capacitacionApi.habilidadesEmpleado(employeeId, selectedCompanyId)
    : canViewMine ? capacitacionApi.misHabilidades() : Promise.resolve([]), [employeeId, selectedCompanyId, canViewMine, revision])
  const resource = useAsyncResource(load)
  return <section className="page-stack">
    <PageHeader eyebrow="Capacitación" title="Perfil de habilidades" description="Habilidades registradas y adquiridas mediante capacitación." />
    {canViewOthers && selectedCompanyId && <Panel title="Consultar empleado"><EmpleadoPicker empresaId={selectedCompanyId} value={employeeId} onChange={setEmployeeId} soloActivos={false} label={canViewMine ? 'Empleado (deja vacío para ver las tuyas)' : 'Empleado'} /></Panel>}
    {canViewOthers && !canViewMine && !employeeId && <EmptyState title="Selecciona un empleado" message="Elige una persona para consultar sus habilidades." />}
    {(canViewMine || employeeId) && (resource.loading ? <LoadingBlock message="Cargando habilidades…" /> : resource.error ? <Alert tone="error">{resource.error} <Button size="sm" variant="secondary" onClick={() => setRevision(value => value + 1)}>Reintentar</Button></Alert> : !resource.data?.length ? <EmptyState title="Sin habilidades registradas" message="Las habilidades aparecerán aquí cuando se registren en el perfil." /> : <Panel title={employeeId ? 'Habilidades del empleado' : 'Mis habilidades'} count={`${resource.data.length} registradas`}><ul className="sprint4-lesson-list">{resource.data.map(item => <li key={item.id}><span><strong>{item.habilidad_nombre ?? `Habilidad ${item.habilidad_id}`}</strong><small>{[item.nivel, item.adquirida_en ? `Adquirida: ${item.adquirida_en}` : null, item.curso_titulo ? `Curso: ${item.curso_titulo}` : null].filter(Boolean).join(' · ') || 'Sin detalles adicionales'}</small></span></li>)}</ul></Panel>)}
  </section>
}
