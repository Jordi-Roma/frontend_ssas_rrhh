import type { ChartSummary } from '../api/reportesApi'
import './report-charts.css'

export type ChartKind = 'bars' | 'donut' | 'line'
const colors = ['#166f53', '#5ab58b', '#b6d96a', '#e6aa58', '#748db9', '#9a80b7', '#d98984', '#9aa9a0', '#d1d9cf']
const number = (value: number) => new Intl.NumberFormat('es-BO', { maximumFractionDigits: 2 }).format(value)

export function ReportChart({ data, kind, title }: { data: ChartSummary; kind: ChartKind; title: string }) {
  const groups = data.grupos
  const maximum = Math.max(1, ...groups.map(item => item.value))
  const total = groups.reduce((sum, item) => sum + item.value, 0)
  const points = groups.map((item, index) => ({
    x: groups.length === 1 ? 50 : 7 + index * 86 / (groups.length - 1),
    y: 83 - item.value / maximum * 65,
  }))
  let arc = 0

  return <div className="report-chart" role="group" aria-label={`Gráfico de ${title}`}>
    <div className="report-chart-heading"><div><span>RESUMEN VISUAL</span><h3>{title}</h3></div><strong>{number(data.total)} <small>registros</small></strong></div>
    {groups.length === 0 ? <div className="report-chart-empty">No hay registros para los filtros seleccionados.</div> : <>
      {kind === 'bars' && <div className="report-chart-bars">{groups.map((item, index) => <div className="report-chart-bar" key={item.label}>
        <div className="report-chart-bar-label"><span title={item.label}>{item.label}</span><strong>{number(item.value)}</strong></div>
        <div className="report-chart-track"><i style={{ width: `${Math.max(2, item.value / maximum * 100)}%`, background: colors[index % colors.length] }} /></div>
      </div>)}</div>}
      {kind === 'donut' && <div className="report-chart-donut-layout"><div className="report-chart-donut" role="img" aria-label={groups.map(item => `${item.label}: ${number(item.value)}`).join(', ')}>
        <svg viewBox="0 0 220 220" aria-hidden="true"><circle cx="110" cy="110" r="79" fill="none" stroke="#e9efea" strokeWidth="30" />
          {groups.map((item, index) => { const portion = total ? item.value / total * 100 : 0; const start = arc; arc += portion; return <circle key={item.label} cx="110" cy="110" r="79" fill="none" stroke={colors[index % colors.length]} strokeWidth="30" strokeDasharray={`${portion * 4.963} ${496.3 - portion * 4.963}`} strokeDashoffset={-start * 4.963} transform="rotate(-90 110 110)" /> })}
        </svg><div><strong>{number(data.total_valor)}</strong><span>en total</span></div></div>
        <ul className="report-chart-legend">{groups.map((item, index) => <li key={item.label}><i style={{ background: colors[index % colors.length] }} /><span title={item.label}>{item.label}</span><strong>{number(item.value)}</strong></li>)}</ul>
      </div>}
      {kind === 'line' && <div className="report-chart-line"><svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={groups.map(item => `${item.label}: ${number(item.value)}`).join(', ')}>
        {[18, 40, 62, 83].map(y => <line key={y} x1="4" x2="97" y1={y} y2={y} stroke="#e4ebe6" strokeWidth=".4" />)}
        {points.length > 1 && <polyline points={points.map(point => `${point.x},${point.y}`).join(' ')} fill="none" stroke="#166f53" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" />}
        {points.map((point, index) => <circle key={groups[index].label} cx={point.x} cy={point.y} r="1.8" fill="#166f53" stroke="white" strokeWidth=".8" />)}
      </svg><div className="report-chart-line-labels">{groups.map(item => <span key={item.label} title={`${item.label}: ${number(item.value)}`}>{item.label}</span>)}</div></div>}
      <div className="report-chart-caption">{data.metrica ? `Suma de ${data.metrica.replaceAll('_', ' ')}` : 'Cantidad de registros'} por {data.campo.replaceAll('_', ' ')}.{data.limite_meses ? ' Se muestran los 24 meses más recientes.' : ''}</div>
    </>}
  </div>
}
