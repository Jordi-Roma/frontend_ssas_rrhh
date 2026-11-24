import { useEffect, useState } from 'react'
import { Activity, ArrowRight, BriefcaseBusiness, Building2, FileText, LayoutDashboard, UsersRound } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getDashboardResumen } from '../../features/dashboard/api/dashboardApi'
import { useAuth } from '../../features/auth/hooks/useAuth'
import type { components } from '../../shared/api/schema'
import './dashboard.css'

type Dashboard = components['schemas']['ResumenDashboardResponse']
type Metric = { label: string; value: number | undefined; icon: LucideIcon; note: string }

function Distribution({ title, subtitle, values, empty }: {
  title: string; subtitle: string; values: { label: string; value: number }[]; empty: string
}) {
  const rows = values.filter(item => item.value > 0).sort((a, b) => b.value - a.value)
  const max = Math.max(1, ...rows.map(item => item.value))
  const total = rows.reduce((sum, item) => sum + item.value, 0)
  return <section className="dashboard-panel">
    <div className="dashboard-panel-heading"><div><p className="dashboard-overline">DISTRIBUCIÓN</p><h2>{title}</h2><span>{subtitle}</span></div><strong className="dashboard-panel-total">{total}</strong></div>
    {rows.length === 0 ? <div className="dashboard-empty">{empty}</div> : <div className="dashboard-bars" role="list">
      {rows.map(({ label, value }, index) => <div className="dashboard-bar-row" role="listitem" key={label}>
        <div className="dashboard-bar-label"><span><i className={`dashboard-dot dashboard-dot-${index % 4}`} />{label.replaceAll('_', ' ')}</span><strong>{value}</strong></div>
        <div className="dashboard-bar-track" role="img" aria-label={`${label}: ${value}`}><span style={{ width: `${Math.max(3, value / max * 100)}%` }} /></div>
      </div>)}
    </div>}
  </section>
}

function ShareChart({ title, first, second, firstLabel, secondLabel }: {
  title: string; first: number; second: number; firstLabel: string; secondLabel: string
}) {
  const total = first + second
  const percentage = total > 0 ? Math.round(first / total * 100) : 0
  return <section className="dashboard-panel dashboard-share-panel">
    <div className="dashboard-panel-heading"><div><p className="dashboard-overline">COMPOSICIÓN</p><h2>{title}</h2><span>Distribución actual</span></div></div>
    <div className="dashboard-share-body">
      <div className="dashboard-ring" role="img" aria-label={`${firstLabel}: ${first}; ${secondLabel}: ${second}`} style={{ '--share': `${percentage}%` } as React.CSSProperties}><div><strong>{total}</strong><span>en total</span></div></div>
      <div className="dashboard-share-legend"><div><i className="dashboard-dot dashboard-dot-0" /><span>{firstLabel}</span><strong>{first}</strong></div><div><i className="dashboard-dot dashboard-dot-1" /><span>{secondLabel}</span><strong>{second}</strong></div></div>
    </div>
  </section>
}

export function DashboardPage() {
  const { user } = useAuth()
  const isPlatform = user?.realm === 'platform'
  const [data, setData] = useState<Dashboard | null>(null)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    let active = true
    let inFlight = false
    const refresh = async () => {
      if (!active || inFlight || document.visibilityState === 'hidden') return
      inFlight = true
      try {
        const result = await getDashboardResumen()
        if (active) { setData(result); setError(''); setLastUpdated(new Date()) }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'No se pudo cargar el dashboard.')
      } finally { inFlight = false }
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
  const vacancies = Object.entries(empresa?.vacantes_por_estado ?? {}).map(([label, value]) => ({ label, value }))
  const stages = Object.entries(empresa?.postulaciones_por_etapa ?? {}).map(([label, value]) => ({ label, value }))
  const applications = stages.reduce((sum, item) => sum + item.value, 0)
  const metrics: Metric[] = isPlatform
    ? [
        { label: 'Empresas activas', value: plataforma?.empresas_activas, icon: Building2, note: 'Operando en la plataforma' },
        { label: 'Usuarios registrados', value: plataforma?.usuarios_totales, icon: UsersRound, note: 'En todas las empresas' },
        { label: 'Vacantes publicadas', value: plataforma?.vacantes_publicadas, icon: BriefcaseBusiness, note: 'Visibles actualmente' },
        { label: 'Postulaciones del mes', value: plataforma?.postulaciones_del_mes, icon: FileText, note: 'Actividad de reclutamiento' },
      ]
    : [
        { label: 'Usuarios activos', value: empresa?.usuarios_activos, icon: UsersRound, note: 'Con acceso a la empresa' },
        { label: 'Vacantes publicadas', value: empresa?.vacantes_por_estado.PUBLICADA, icon: BriefcaseBusiness, note: 'Oportunidades visibles' },
        { label: 'Postulaciones', value: data ? applications : undefined, icon: FileText, note: 'En todas las etapas' },
        { label: 'Cargos registrados', value: empresa?.cargos, icon: LayoutDashboard, note: 'En la organización' },
      ]

  return <section className="dashboard-page" aria-labelledby="dashboard-title">
    <header className="dashboard-hero"><div><p className="dashboard-overline">CENTRO DE CONTROL</p><h1 id="dashboard-title">Dashboard</h1><p>{isPlatform ? 'Una vista de la actividad de toda la plataforma.' : 'Una vista clara de la actividad de tu empresa.'}</p></div><div className="dashboard-live" role="status"><span className="dashboard-live-dot" />{lastUpdated ? `Actualizado ${lastUpdated.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : 'Cargando datos'}</div></header>
    {error && <p className="dashboard-error" role="alert">{error}{data && ' Se muestran los últimos datos recibidos.'}</p>}
    <div className="dashboard-welcome"><div><span>RESUMEN GENERAL</span><h2>Hola, {user?.name ?? 'bienvenido'}</h2><p>{isPlatform ? 'Sigue las empresas, usuarios y postulaciones desde un solo lugar.' : 'Consulta el estado de usuarios, vacantes y postulaciones en tiempo real.'}</p></div><Activity size={48} strokeWidth={1.3} aria-hidden="true" /></div>
    <div className="dashboard-metrics">{metrics.map(({ label, value, icon: Icon, note }) => <article className="dashboard-stat" key={label}><div className="dashboard-stat-icon"><Icon size={21} strokeWidth={1.8} aria-hidden="true" /></div><span>{label}</span><strong>{value === undefined ? '—' : value.toLocaleString('es-BO')}</strong><small>{note}</small></article>)}</div>
    <div className="dashboard-chart-grid">
      {isPlatform ? <><ShareChart title="Estado de empresas" first={plataforma?.empresas_activas ?? 0} second={plataforma?.empresas_suspendidas ?? 0} firstLabel="Activas" secondLabel="Suspendidas" /><section className="dashboard-panel dashboard-overview"><div className="dashboard-panel-heading"><div><p className="dashboard-overline">PLATAFORMA</p><h2>Estado general</h2><span>Indicadores complementarios</span></div></div><div className="dashboard-overview-list"><div><Building2 size={19} /><span>Empresas suspendidas</span><strong>{plataforma?.empresas_suspendidas ?? '—'}</strong></div><div><Building2 size={19} /><span>Empresas eliminadas</span><strong>{plataforma?.empresas_eliminadas ?? '—'}</strong></div><div><FileText size={19} /><span>Postulaciones este mes</span><strong>{plataforma?.postulaciones_del_mes ?? '—'}</strong></div></div><Link to="/empresas" className="dashboard-panel-link">Ver empresas <ArrowRight size={16} /></Link></section></> : <><Distribution title="Vacantes por estado" subtitle="Situación de las oportunidades" values={vacancies} empty="Todavía no hay vacantes registradas." /><Distribution title="Postulaciones por etapa" subtitle="Avance del proceso de selección" values={stages} empty="Todavía no hay postulaciones registradas." /><ShareChart title="Estado de usuarios" first={empresa?.usuarios_activos ?? 0} second={empresa?.usuarios_inactivos ?? 0} firstLabel="Activos" secondLabel="Inactivos" /><section className="dashboard-panel dashboard-overview"><div className="dashboard-panel-heading"><div><p className="dashboard-overline">ORGANIZACIÓN</p><h2>Estructura de la empresa</h2><span>Datos registrados</span></div></div><div className="dashboard-overview-list"><div><Building2 size={19} /><span>Departamentos</span><strong>{empresa?.departamentos ?? '—'}</strong></div><div><BriefcaseBusiness size={19} /><span>Cargos</span><strong>{empresa?.cargos ?? '—'}</strong></div><div><UsersRound size={19} /><span>Usuarios totales</span><strong>{empresa ? empresa.usuarios_activos + empresa.usuarios_inactivos : '—'}</strong></div></div></section></>}
    </div>
    <section className="dashboard-panel dashboard-activity"><div className="dashboard-panel-heading"><div><p className="dashboard-overline">MOVIMIENTO RECIENTE</p><h2>Actividad reciente</h2><span>Últimos eventos registrados</span></div><span className="dashboard-activity-count">{data?.bitacora_reciente?.length ?? 0} eventos</span></div>{data?.bitacora_reciente?.length ? <div className="dashboard-timeline">{data.bitacora_reciente.map(item => <article key={item.id}><span className="dashboard-timeline-icon"><Activity size={16} aria-hidden="true" /></span><div><strong>{item.accion.replaceAll('_', ' ')}</strong><p>{item.modulo} · {item.actor ?? 'Sistema'}</p></div><time dateTime={item.fecha}>{new Date(item.fecha).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' })}</time></article>)}</div> : <div className="dashboard-empty">{data ? 'Aún no hay actividad reciente.' : 'Cargando actividad…'}</div>}</section>
  </section>
}
