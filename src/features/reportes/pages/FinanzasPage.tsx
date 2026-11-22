import { useCallback, useEffect, useState } from 'react'
import { Alert, Button, Field, PageHeader, Panel } from '../../../shared/components'
import { finanzasApi, type FinancialReport } from '../api/finanzasApi'
import './finanzas.css'

const year = new Date().getFullYear()
const initialFrom = `${year}-01-01`
const initialTo = new Date().toISOString().slice(0, 10)
const categories = ['BACKUP', 'ALMACENAMIENTO', 'IA', 'MACHINE_LEARNING', 'SOPORTE', 'INFRAESTRUCTURA', 'STRIPE', 'OTROS']

function money(value: number, currency: string) {
  return new Intl.NumberFormat('es-BO', { style: 'currency', currency }).format(value)
}

function BarChart({ rows, currency }: { rows: { label: string; value: number }[]; currency: string }) {
  const max = Math.max(1, ...rows.map(row => row.value))
  if (!rows.length) return <p className="text-muted">Aún no hay movimientos registrados en este período.</p>
  return <div className="finance-bars">{rows.map(row => <div className="finance-bar" key={row.label}>
    <span>{row.label.replaceAll('_', ' ')}</span><div role="img" aria-label={`${row.label}: ${money(row.value, currency)}`}><i style={{ width: `${Math.max(2, row.value / max * 100)}%` }} /></div><strong>{money(row.value, currency)}</strong>
  </div>)}</div>
}

export function FinanzasPage() {
  const [desde, setDesde] = useState(initialFrom)
  const [hasta, setHasta] = useState(initialTo)
  const [moneda, setMoneda] = useState('USD')
  const [filters, setFilters] = useState({ desde: initialFrom, hasta: initialTo, moneda: 'USD' })
  const [report, setReport] = useState<FinancialReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [insight, setInsight] = useState<string | null>(null)
  const [insightLoading, setInsightLoading] = useState(false)
  const [expense, setExpense] = useState({ fecha: initialTo, categoria: 'BACKUP', monto: '', referencia: '', descripcion: '' })

  const refresh = useCallback(async () => {
    setLoading(true); setError(null)
    try { setReport(await finanzasApi.summary(filters.desde, filters.hasta, filters.moneda)) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo cargar el reporte financiero.') }
    finally { setLoading(false) }
  }, [filters])
  useEffect(() => { void refresh() }, [refresh])

  async function addExpense() {
    setSaved(false); setError(null)
    if (!expense.fecha || !expense.referencia.trim() || !Number.isFinite(Number(expense.monto)) || Number(expense.monto) <= 0) {
      setError('Completa fecha, monto positivo y referencia del comprobante.'); return
    }
    try {
      await finanzasApi.addExpense({ ...expense, monto: Number(expense.monto), moneda: filters.moneda, referencia: expense.referencia.trim() })
      setExpense(current => ({ ...current, monto: '', referencia: '', descripcion: '' }))
      setSaved(true); await refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo registrar el gasto.') }
  }

  async function explain() {
    setInsightLoading(true); setError(null); setInsight(null)
    try { setInsight((await finanzasApi.analysis(filters.desde, filters.hasta, filters.moneda)).texto) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo generar el análisis.') }
    finally { setInsightLoading(false) }
  }

  return <section className="page-stack finance-page">
    <PageHeader eyebrow="Análisis · Plataforma" title="Finanzas de suscripciones" description="Cobros confirmados, costos registrados y saldo parcial por período. Solo para administración global." />
    <Panel title="Período y moneda" eyebrow="Filtros"><div className="finance-filters">
      <Field label="Desde"><input type="date" value={desde} onChange={event => setDesde(event.target.value)} /></Field>
      <Field label="Hasta"><input type="date" value={hasta} onChange={event => setHasta(event.target.value)} /></Field>
      <Field label="Moneda"><select value={moneda} onChange={event => setMoneda(event.target.value)}><option value="USD">USD</option><option value="BOB">BOB</option><option value="EUR">EUR</option></select></Field>
      <Button disabled={loading} onClick={() => { if (hasta < desde) { setError('El rango de fechas no es válido.'); return } setFilters({ desde, hasta, moneda }) }}>Aplicar</Button>
    </div></Panel>
    {error && <Alert tone="error">{error}</Alert>}
    {loading && <p role="status">Cargando movimientos financieros…</p>}
    {report && <>
      <div className="finance-metrics">
        <article><span>Ingresos cobrados</span><strong>{money(report.ingresos, report.moneda)}</strong><small>{report.cobros} pagos confirmados</small></article>
        <article><span>Reembolsos</span><strong>{money(report.reembolsos, report.moneda)}</strong><small>Descontados del ingreso</small></article>
        <article><span>Costos registrados</span><strong>{money(report.gastos, report.moneda)}</strong><small>Solo comprobantes cargados</small></article>
        <article><span>Saldo parcial</span><strong>{money(report.saldo_parcial, report.moneda)}</strong><small>Ingreso − reembolso − costo registrado</small></article>
      </div>
      <div className="finance-grid">
        <Panel title="Ingresos y costos por mes"><div className="finance-months">{report.meses.map(month => {
          const scale = Math.max(1, ...report.meses.flatMap(item => [item.ingresos, item.gastos]))
          return <div key={month.mes}><strong>{month.mes}</strong><div className="finance-pair"><span aria-label={`Ingresos ${money(month.ingresos, report.moneda)}`} style={{ width: `${month.ingresos / scale * 100}%` }} /><span aria-label={`Costos ${money(month.gastos, report.moneda)}`} style={{ width: `${month.gastos / scale * 100}%` }} /></div><span>Ingreso {money(month.ingresos, report.moneda)}</span><span>Costo {money(month.gastos, report.moneda)}</span><span>Saldo parcial {money(month.saldo_parcial, report.moneda)}</span></div>
        })}</div>{!report.meses.length && <p className="text-muted">No hay datos para este período.</p>}</Panel>
        <Panel title="Ventas por plan"><BarChart currency={report.moneda} rows={report.ventas_por_plan.map(item => ({ label: item.plan, value: item.monto }))} /></Panel>
        <Panel title="Distribución de costos"><BarChart currency={report.moneda} rows={report.costos_por_categoria.map(item => ({ label: item.categoria, value: item.monto }))} /></Panel>
      </div>
      <Panel title="Lectura asistida por IA" eyebrow="Análisis"><p>La IA recibe únicamente los totales agregados de este reporte. Comprueba sus conclusiones con las cifras anteriores.</p><Button disabled={insightLoading} loading={insightLoading || undefined} onClick={() => void explain()}>Explicar variaciones</Button>{insight && <p className="finance-insight">{insight}</p>}</Panel>
      <Panel title="Alcance de los datos" eyebrow="Transparencia">{report.advertencias.map(item => <p key={item}>{item}</p>)}</Panel>
    </>}
    <Panel title="Registrar costo" eyebrow="Comprobante externo"><div className="finance-filters">
      <Field label="Fecha"><input type="date" value={expense.fecha} onChange={event => setExpense({ ...expense, fecha: event.target.value })} /></Field>
      <Field label="Categoría"><select value={expense.categoria} onChange={event => setExpense({ ...expense, categoria: event.target.value })}>{categories.map(item => <option key={item} value={item}>{item.replaceAll('_', ' ')}</option>)}</select></Field>
      <Field label={`Monto (${filters.moneda})`}><input type="number" min="0.01" step="0.01" value={expense.monto} onChange={event => setExpense({ ...expense, monto: event.target.value })} /></Field>
      <Field label="Referencia de factura o comprobante"><input value={expense.referencia} onChange={event => setExpense({ ...expense, referencia: event.target.value })} /></Field>
      <Field label="Descripción"><input value={expense.descripcion} onChange={event => setExpense({ ...expense, descripcion: event.target.value })} /></Field>
      <Button onClick={() => void addExpense()}>Guardar costo</Button>
    </div>{saved && <Alert tone="success">Costo registrado.</Alert>}</Panel>
  </section>
}
