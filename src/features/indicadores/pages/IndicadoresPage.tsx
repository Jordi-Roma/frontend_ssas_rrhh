import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCompanyScope } from '../../../app/context/CompanyScopeContext'
import { Alert, Button, EmptyState, Field, PageHeader, Panel } from '../../../shared/components'
import { indicadoresApi, type Indicadores } from '../api/indicadoresApi'
import '../../capacitacion/pages/sprint4.css'

function todayLocal() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}
function thirtyDaysAgo() {
  const date = new Date(); date.setDate(date.getDate() - 29)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
function Bars({ rows, empty }: { rows: { label: string; count: number }[]; empty: string }) {
  const max = Math.max(1, ...rows.map(row => row.count))
  if (rows.length === 0 || rows.every(row => row.count === 0)) return <p className="text-muted">{empty}</p>
  return <div className="sprint4-bars" role="list">{rows.map(row => <div key={row.label} className="sprint4-bar-row" role="listitem"><span>{row.label}</span><div className="sprint4-bar-track" role="img" aria-label={`${row.label}: ${row.count}`}><span style={{ width: `${row.count / max * 100}%` }} /></div><strong>{row.count}</strong></div>)}</div>
}

export function IndicadoresPage() {
  const { selectedCompanyId, loading: scopeLoading } = useCompanyScope()
  const [desde, setDesde] = useState(thirtyDaysAgo)
  const [hasta, setHasta] = useState(todayLocal)
  const [applied, setApplied] = useState({ desde: thirtyDaysAgo(), hasta: todayLocal() })
  const [data, setData] = useState<Indicadores | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    if (!selectedCompanyId) return
    let active = true
    let inFlight = false
    setLoading(true)
    setError(null)
    setData(null)
    const refresh = async (initial = false) => {
      if (!active || inFlight || (!initial && document.visibilityState === 'hidden')) return
      inFlight = true
      try {
        const result = await indicadoresApi.obtener(selectedCompanyId, applied.desde, applied.hasta)
        if (active) { setData(result); setError(null) }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los indicadores.')
      } finally {
        inFlight = false
        if (active && initial) setLoading(false)
      }
    }
    const refreshWhenVisible = () => { if (document.visibilityState === 'visible') void refresh() }
    void refresh(true)
    const interval = window.setInterval(() => { void refresh() }, 3000)
    window.addEventListener('focus', refreshWhenVisible)
    document.addEventListener('visibilitychange', refreshWhenVisible)
    return () => {
      active = false
      window.clearInterval(interval)
      window.removeEventListener('focus', refreshWhenVisible)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [selectedCompanyId, applied, revision])

  const funnel = useMemo(() => data ? Object.entries(data.embudo_reclutamiento).map(([label, count]) => ({ label: label.replaceAll('_', ' '), count })) : [], [data])
  const stages = useMemo(() => data?.embudo_por_etapa.map(item => ({ label: item.etapa, count: item.postulaciones })) ?? [], [data])
  const departments = useMemo(() => data?.headcount_por_departamento.map(item => ({ label: item.departamento, count: item.empleados })) ?? [], [data])

  if (!selectedCompanyId && !scopeLoading) return <EmptyState title="Selecciona una empresa" message="Los indicadores se calculan para la empresa activa." />
  return <section className="page-stack sprint4-page">
    <PageHeader eyebrow="Análisis" title="Indicadores de recursos humanos" description="Consulta rotación, ausentismo, contratación y composición del equipo con datos reales de la empresa." />
    <Panel title="Período de análisis" eyebrow="Filtros">
      <div className="sprint4-filter"><Field label="Desde"><input type="date" value={desde} onChange={e => setDesde(e.target.value)} /></Field><Field label="Hasta"><input type="date" value={hasta} onChange={e => setHasta(e.target.value)} /></Field><Button disabled={loading} onClick={() => {
        if (!desde || !hasta || hasta < desde) { setError('Selecciona un rango de fechas válido.'); return }
        const days = (Date.parse(`${hasta}T12:00:00`) - Date.parse(`${desde}T12:00:00`)) / 86_400_000
        if (days > 366) { setError('El rango máximo es de 367 días.'); return }
        setApplied({ desde, hasta }); setRevision(value => value + 1)
      }}>Aplicar filtros</Button></div>
    </Panel>
    {error && <Alert tone="error">{error} <Button size="sm" variant="secondary" onClick={() => setRevision(value => value + 1)}>Reintentar</Button></Alert>}
    {loading && <p role="status">Calculando indicadores…</p>}
    {data && <>
      <div className="sprint4-metrics"><article><span>Rotación</span><strong>{data.rotacion.porcentaje.toFixed(1)}%</strong><small>{data.rotacion.salidas} salidas · {data.rotacion.ingresos} ingresos</small></article><article><span>Ausentismo</span><strong>{data.ausentismo.porcentaje.toFixed(1)}%</strong><small>{data.ausentismo.dias_habiles_ausentes} días hábiles ausentes</small></article><article><span>Tiempo de contratación</span><strong>{data.tiempo_promedio_contratacion.dias == null ? '—' : `${data.tiempo_promedio_contratacion.dias.toFixed(1)} días`}</strong><small>{data.tiempo_promedio_contratacion.contrataciones_medir} contrataciones medidas</small></article><article><span>Personal activo</span><strong>{data.rotacion.dotacion_final}</strong><small>Al cierre del período</small></article></div>
      <div className="sprint4-charts"><Panel title="Personal por departamento" count="Empleados con contrato vigente"><Bars rows={departments} empty="No hay empleados por departamento para esta fecha." /></Panel><Panel title="Embudo de reclutamiento" count="Postulaciones del período"><Bars rows={funnel} empty="No hay postulaciones en este período." /></Panel><Panel title="Etapas de reclutamiento" count="Distribución por etapa"><Bars rows={stages} empty="No hay postulaciones en etapas configuradas." /></Panel><Panel title="Detalle del período"><dl className="sprint4-detail"><div><dt>Dotación inicial</dt><dd>{data.rotacion.dotacion_inicial}</dd></div><div><dt>Dotación final</dt><dd>{data.rotacion.dotacion_final}</dd></div><div><dt>Días hábiles posibles</dt><dd>{data.ausentismo.dias_habiles_posibles}</dd></div><div><dt>Días de ausencia solicitados</dt><dd>{data.ausentismo.dias_solicitados}</dd></div></dl><Link to="/reportes">Ir a reportes y exportaciones →</Link></Panel></div>
    </>}
  </section>
}
