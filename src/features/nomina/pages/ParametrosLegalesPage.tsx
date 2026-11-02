import { useState, type FormEvent } from 'react'
import { Alert, Button, DataTable, Field, LoadingBlock, PageHeader, Panel } from '../../../shared/components'
import { useAsyncResource } from '../../../shared/hooks/useAsyncResource'
import { crearTasaLegal, getTasasLegales, registrarSalarioMinimo, type TasaLegal } from '../api/parametrosLegalesApi'

const CONCEPTOS = [
  ['AFP_LABORAL_BO', 'Aporte laboral SIP'],
  ['SOLIDARIO_LABORAL_BO', 'Aporte solidario laboral'],
  ['CNS_PATRONAL_BO', 'Caja Nacional de Salud patronal'],
  ['VIVIENDA_PATRONAL_BO', 'Vivienda patronal'],
  ['RIESGO_PATRONAL_BO', 'Riesgo profesional patronal'],
  ['SOLIDARIO_PATRONAL_BO', 'Aporte solidario patronal'],
] as const

function seSuperponen(a: string, b: string, row: TasaLegal) {
  return row.vigente_desde <= b && row.vigente_hasta >= a
}

export function ParametrosLegalesPage() {
  const resource = useAsyncResource(getTasasLegales)
  const [codigo, setCodigo] = useState<string>('SOLIDARIO_LABORAL_BO')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [valor, setValor] = useState('')
  const [norma, setNorma] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const salario = codigo === 'SMN_BO'
  const registros = resource.data ?? []
  const vigencias = registros.filter(row => row.codigo === codigo)

  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null); setSuccess(null)
    if (desde > hasta) { setError('La fecha de fin debe ser igual o posterior al inicio.'); return }
    const numero = Number(valor)
    if (!Number.isFinite(numero) || valor.trim() === '' || (salario ? numero <= 0 : numero < 0 || numero > 100)) {
      setError(salario ? 'Ingresa un monto mayor a cero.' : 'Ingresa un porcentaje entre 0 y 100.'); return
    }
    if (vigencias.some(row => seSuperponen(desde, hasta, row))) {
      setError('Ya existe una vigencia para este concepto que se superpone con esas fechas.'); return
    }
    setSaving(true)
    try {
      const data = { vigente_desde: desde, vigente_hasta: hasta, norma_legal: norma.trim() }
      if (salario) await registrarSalarioMinimo({ ...data, monto: numero })
      else await crearTasaLegal(codigo, { ...data, porcentaje: numero })
      setSuccess('Vigencia registrada. Ya aparece en el historial global.')
      setValor(''); setNorma(''); resource.reload()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo registrar la vigencia.')
    } finally { setSaving(false) }
  }

  return <div className="page-stack">
    <PageHeader title="Parámetros legales de nómina" eyebrow="Administración global" description="Registra tasas verificadas para el cálculo de todas las empresas." />
    <Alert tone="info">Estos valores son globales. Verifica el porcentaje o monto, su norma y su vigencia antes de guardar. Las tasas existentes se conservan como historial.</Alert>
    <Panel title="Registrar vigencia">
      <form className="form-stack" onSubmit={event => void guardar(event)}>
        <div className="form-grid">
          <Field label="Concepto"><select value={codigo} onChange={event => { setCodigo(event.target.value); setError(null); setSuccess(null) }}>
            {CONCEPTOS.map(([clave, nombre]) => <option key={clave} value={clave}>{nombre} ({clave})</option>)}
            <option value="SMN_BO">Salario mínimo nacional (SMN_BO)</option>
          </select></Field>
          <Field label={salario ? 'Monto (Bs)' : 'Porcentaje (%)'}><input type="number" min={salario ? '0.01' : '0'} max={salario ? undefined : '100'} step={salario ? '0.01' : '0.0001'} value={valor} onChange={event => setValor(event.target.value)} required /></Field>
        </div>
        <div className="form-grid">
          <Field label="Vigente desde"><input type="date" value={desde} onChange={event => setDesde(event.target.value)} required /></Field>
          <Field label="Vigente hasta"><input type="date" min={desde || undefined} value={hasta} onChange={event => setHasta(event.target.value)} required /></Field>
        </div>
        <Field label="Norma legal"><input value={norma} onChange={event => setNorma(event.target.value)} minLength={5} required placeholder="Ley o decreto y artículo aplicable" /></Field>
        {error && <Alert tone="error">{error}</Alert>}
        {success && <Alert tone="success">{success}</Alert>}
        <div className="form-actions"><Button type="submit" loading={saving} disabled={resource.loading || !!resource.error}>Registrar vigencia</Button></div>
      </form>
    </Panel>
    <Panel title={`Vigencias registradas: ${codigo}`}>
      {resource.loading && <LoadingBlock message="Cargando vigencias…" />}
      {resource.error && <Alert tone="error">{resource.error} <Button variant="secondary" onClick={resource.reload}>Reintentar</Button></Alert>}
      {!resource.loading && !resource.error && <DataTable<TasaLegal> rows={vigencias} rowKey={row => row.id} emptyMessage="No hay vigencias registradas para este concepto." columns={[
        { key: 'desde', header: 'Desde', render: row => row.vigente_desde },
        { key: 'hasta', header: 'Hasta', render: row => row.vigente_hasta },
        { key: 'valor', header: salario ? 'Monto (Bs)' : 'Porcentaje (%)', render: row => salario ? row.monto ?? '—' : row.porcentaje ?? '—' },
        { key: 'norma', header: 'Norma legal', render: row => row.norma_legal ?? 'Sin norma' },
      ]} />}
    </Panel>
  </div>
}
