import { useEffect, useState } from 'react'
import { getDashboardResumen } from '../../features/dashboard/api/dashboardApi'
import { useAuth } from '../../features/auth/hooks/useAuth'
import type { components } from '../../shared/api/schema'

type Dashboard = components['schemas']['ResumenDashboardResponse']

export function DashboardPage() {
  const { user } = useAuth()
  const isPlatform = user?.realm === 'platform'
  const [data, setData] = useState<Dashboard | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    let inFlight = false
    const refresh = async () => {
      if (!active || inFlight || document.visibilityState === 'hidden') return
      inFlight = true
      try {
        const result = await getDashboardResumen()
        if (active) { setData(result); setError('') }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'No se pudo cargar el resumen.')
      } finally {
        inFlight = false
      }
    }
    const refreshWhenVisible = () => { if (document.visibilityState === 'visible') void refresh() }
    void refresh()
    const interval = window.setInterval(() => { void refresh() }, 3000)
    window.addEventListener('focus', refreshWhenVisible)
    document.addEventListener('visibilitychange', refreshWhenVisible)
    return () => {
      active = false
      window.clearInterval(interval)
      window.removeEventListener('focus', refreshWhenVisible)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [])

  const empresa = data?.empresa
  const plataforma = data?.plataforma

  const vacantesActivas = (empresa?.vacantes_por_estado.PUBLICADA ?? 0) + (empresa?.vacantes_por_estado.PAUSADA ?? 0)
  const totalPostulaciones = Object.values(empresa?.postulaciones_por_etapa ?? {}).reduce((sum, n) => sum + n, 0)
  const metricas = isPlatform
    ? [
        ['Empresas activas', plataforma?.empresas_activas ?? 0],
        ['Empresas suspendidas', plataforma?.empresas_suspendidas ?? 0],
        ['Vacantes publicadas', plataforma?.vacantes_publicadas ?? 0],
        ['Postulaciones del mes', plataforma?.postulaciones_del_mes ?? 0],
        ['Usuarios totales', plataforma?.usuarios_totales ?? 0],
        ['Empresas eliminadas', plataforma?.empresas_eliminadas ?? 0],
      ]
    : [
        ['Usuarios activos', empresa?.usuarios_activos ?? 0],
        ['Usuarios inactivos', empresa?.usuarios_inactivos ?? 0],
        ['Vacantes publicadas', empresa?.vacantes_por_estado.PUBLICADA ?? 0],
        ['Vacantes activas', vacantesActivas],
        ['Total postulaciones', totalPostulaciones],
        ['Cargos registrados', empresa?.cargos ?? 0],
      ]
  const etapas = Object.entries(empresa?.postulaciones_por_etapa ?? {})

  return (
    <section className="page-stack" aria-labelledby="dashboard-title">
      <div>
        <p className="eyebrow">Panel principal</p>
        <h1 id="dashboard-title">Hola, {user?.name}</h1>
        <p className="page-description">
          {isPlatform
            ? 'Administra empresas desde los servicios globales de la plataforma.'
            : 'Administra usuarios, roles, vacantes y eventos de auditoría de tu empresa.'}
        </p>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="card-grid">{metricas.map(([label, value], index) => <article className="card" key={label}><span className="card-number">{String(index + 1).padStart(2, '0')}</span><h2>{label}</h2><p className="dashboard-metric">{value}</p></article>)}</div>
      {!isPlatform && etapas.length > 0 && (
        <section className="panel">
          <div className="panel-heading"><h2>Postulaciones por etapa</h2><span className="panel-count">{totalPostulaciones} total</span></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Etapa</th><th>Postulaciones</th></tr></thead>
              <tbody>
                {etapas.map(([etapa, cantidad]) => (
                  <tr key={etapa}>
                    <td>{etapa}</td>
                    <td>{cantidad}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      <section className="panel">
        <div className="panel-heading"><h2>Actividad reciente</h2><span className="panel-count">{data?.bitacora_reciente?.length ?? 0} eventos</span></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Fecha</th><th>Módulo</th><th>Acción</th><th>Actor</th></tr></thead>
            <tbody>
              {data?.bitacora_reciente?.map((item) => (
                <tr key={item.id}>
                  <td>{new Date(item.fecha).toLocaleString('es-BO')}</td>
                  <td>{item.modulo}</td>
                  <td>{item.accion}</td>
                  <td>{item.actor ?? 'Sistema'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data !== null && data.bitacora_reciente?.length === 0 && <div className="empty-table">No hay actividad reciente.</div>}
        </div>
      </section>
    </section>
  )
}
