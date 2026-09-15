import { useEffect, useMemo, useState } from 'react'
import { Download, Eye, Filter as FilterIcon, Plus, Save, Trash2 } from 'lucide-react'
import { useCompanyScope } from '../../../app/context/CompanyScopeContext'
import { Alert, Button, Field, PageHeader, Panel } from '../../../shared/components'
import { reportesApi, saveBlob, type Filter, type Preview, type ReportConfig, type Source } from '../api/reportesApi'

const EMPTY_FILTER: Filter = { campo: '', operador: 'igual', valor: '' }

export function ReportesPage() {
  const { company } = useCompanyScope()
  const [sources, setSources] = useState<Source[]>([])
  const [sourceCode, setSourceCode] = useState('')
  const [columns, setColumns] = useState<string[]>([])
  const [filters, setFilters] = useState<Filter[]>([])
  const [orderField, setOrderField] = useState('')
  const [direction, setDirection] = useState<'asc' | 'desc'>('asc')
  const [preview, setPreview] = useState<Preview | null>(null)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const source = useMemo(() => sources.find((item) => item.codigo === sourceCode), [sources, sourceCode])

  useEffect(() => {
    reportesApi.catalog().then((items) => {
      setSources(items)
      if (items[0]) setSourceCode(items[0].codigo)
    }).catch((error: Error) => setMessage(error.message))
  }, [])

  useEffect(() => { setColumns([]); setFilters([]); setOrderField(''); setPreview(null) }, [sourceCode])

  const config = (): ReportConfig => ({
    fuente: sourceCode,
    columnas: columns,
    filtros: filters.filter((item) => item.campo && item.valor !== ''),
    orden: orderField ? [{ campo: orderField, direccion: direction }] : [],
  })

  async function runPreview() {
    if (!columns.length) return setMessage('Selecciona al menos una columna.')
    setBusy(true); setMessage(null)
    try { setPreview(await reportesApi.preview(config(), company?.id)) }
    catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo generar la vista previa.') }
    finally { setBusy(false) }
  }

  async function download(format: 'xlsx' | 'html' | 'pdf') {
    setBusy(true); setMessage(null)
    try { saveBlob(await reportesApi.export(format, config(), company?.id), `reporte.${format}`) }
    catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo exportar.') }
    finally { setBusy(false) }
  }

  return <section className="page-stack">
    <PageHeader eyebrow="Análisis" title="Reportes personalizables" description="Selecciona la información, aplica filtros y revisa una vista previa antes de exportar." />
    {message && <Alert tone="info">{message}</Alert>}
    <Panel title="Constructor de reporte" eyebrow="Configuración">
      <div className="form-grid">
        <Field label="Fuente"><select value={sourceCode} onChange={(e) => setSourceCode(e.target.value)}>{sources.map((item) => <option key={item.codigo} value={item.codigo}>{item.nombre}</option>)}</select></Field>
        <Field label="Nombre para guardar"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Postulaciones del mes" /></Field>
      </div>
      <Field label="Columnas"><div className="check-grid">{source?.columnas.map((column) => <label className="check-label" key={column}><input type="checkbox" checked={columns.includes(column)} onChange={() => setColumns((current) => current.includes(column) ? current.filter((item) => item !== column) : [...current, column])} />{column.replaceAll('_', ' ')}</label>)}</div></Field>
      <div className="report-builder-list">
        <div className="panel-heading"><h3>Filtros</h3><Button size="sm" variant="secondary" onClick={() => setFilters((items) => [...items, { ...EMPTY_FILTER }])}><Plus size={16} aria-hidden="true" />Añadir filtro</Button></div>
        {filters.length === 0 && <div className="inline-empty"><FilterIcon size={18} aria-hidden="true" /><span>Sin filtros. El reporte incluirá todos los registros disponibles.</span></div>}
        {filters.map((filter, index) => <div className="report-filter-row" key={index}>
          <select aria-label={`Campo del filtro ${index + 1}`} value={filter.campo} onChange={(e) => setFilters((items) => items.map((item, i) => i === index ? { ...item, campo: e.target.value } : item))}><option value="">Campo</option>{source?.columnas.map((column) => <option key={column}>{column}</option>)}</select>
          <select aria-label={`Operador del filtro ${index + 1}`} value={filter.operador} onChange={(e) => setFilters((items) => items.map((item, i) => i === index ? { ...item, operador: e.target.value as Filter['operador'] } : item))}><option value="igual">Igual</option><option value="contiene">Contiene</option><option value="mayor_igual">Mayor o igual</option><option value="menor_igual">Menor o igual</option></select>
          <input aria-label={`Valor del filtro ${index + 1}`} value={String(filter.valor)} onChange={(e) => setFilters((items) => items.map((item, i) => i === index ? { ...item, valor: e.target.value } : item))} />
          <button className="icon-button icon-button-danger" type="button" onClick={() => setFilters((items) => items.filter((_, i) => i !== index))} title="Quitar filtro" aria-label={`Quitar filtro ${index + 1}`}><Trash2 size={17} aria-hidden="true" /></button>
        </div>)}
      </div>
      <div className="form-grid"><Field label="Ordenar por"><select value={orderField} onChange={(e) => setOrderField(e.target.value)}><option value="">Sin orden</option>{source?.columnas.map((column) => <option key={column}>{column}</option>)}</select></Field><Field label="Dirección"><select value={direction} onChange={(e) => setDirection(e.target.value as 'asc' | 'desc')}><option value="asc">Ascendente</option><option value="desc">Descendente</option></select></Field></div>
      <div className="sticky-actions"><Button onClick={() => void runPreview()} loading={busy}><Eye size={17} aria-hidden="true" />Vista previa</Button><Button variant="secondary" disabled={!name.trim() || !columns.length} onClick={() => void reportesApi.create(name, config(), company?.id).then(() => setMessage('Reporte guardado.')).catch((e: Error) => setMessage(e.message))}><Save size={17} aria-hidden="true" />Guardar definición</Button></div>
    </Panel>
    {preview && <Panel title="Vista previa" count={`${preview.total} registros`}><div className="table-wrap"><table><thead><tr>{preview.columnas.map((column) => <th key={column}>{column.replaceAll('_', ' ')}</th>)}</tr></thead><tbody>{preview.items.map((row, index) => <tr key={index}>{preview.columnas.map((column) => <td key={column}>{String(row[column] ?? '')}</td>)}</tr>)}</tbody></table></div><div className="form-actions"><Button variant="secondary" onClick={() => void download('xlsx')}><Download size={16} aria-hidden="true" />Excel</Button><Button variant="secondary" onClick={() => void download('html')}><Download size={16} aria-hidden="true" />HTML</Button><Button variant="secondary" onClick={() => void download('pdf')}><Download size={16} aria-hidden="true" />PDF</Button></div></Panel>}
  </section>
}
