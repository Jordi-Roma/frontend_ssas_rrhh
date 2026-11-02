import { useEffect, useState } from 'react'
import { getEmpleados, nombreCompleto, type Empleado } from '../../../shared/api/empleadosApi'
import { Alert, Button, Field } from '../../../shared/components'
import type { FichaEmpleadoVinculo } from '../api/usuariosApi'

export type FichaMode = 'existente' | 'nueva'
export type FichaForm = {
  mode: FichaMode
  empleado_id: string
  codigo: string
  nombres: string
  apellido_paterno: string
  apellido_materno: string
  ci: string
  ci_expedido: string
  fecha_ingreso: string
}

export const FICHA_VACIA: FichaForm = {
  mode: 'existente', empleado_id: '', codigo: '', nombres: '', apellido_paterno: '',
  apellido_materno: '', ci: '', ci_expedido: '', fecha_ingreso: '',
}

export function fichaPayload(ficha: FichaForm): FichaEmpleadoVinculo | null {
  if (ficha.mode === 'existente') return ficha.empleado_id ? { empleado_id: ficha.empleado_id } : null
  if (![ficha.codigo, ficha.nombres, ficha.apellido_paterno, ficha.ci, ficha.ci_expedido, ficha.fecha_ingreso].every(value => value.trim())) return null
  return { nueva_ficha: {
    codigo: ficha.codigo.trim(), nombres: ficha.nombres.trim(),
    apellido_paterno: ficha.apellido_paterno.trim(), apellido_materno: ficha.apellido_materno.trim() || null,
    ci: ficha.ci.trim(), ci_expedido: ficha.ci_expedido.trim(), fecha_ingreso: ficha.fecha_ingreso,
  } }
}

export function FichaEmpleadoFields({ empresaId, value, onChange, linkedId, loadingLink }: {
  empresaId: string | null | undefined
  value: FichaForm
  onChange: (value: FichaForm) => void
  linkedId?: string | null
  loadingLink?: boolean
}) {
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [offset, setOffset] = useState(0)
  const [more, setMore] = useState(false)
  useEffect(() => {
    if (!empresaId || linkedId || loadingLink) return
    let active = true
    setLoading(true)
    getEmpleados(empresaId, offset, 100).then(items => { if (active) {
      setEmpleados(previous => offset === 0 ? items : [...previous, ...items])
      setMore(items.length === 100)
    } })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : 'No se pudieron cargar las fichas.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [empresaId, linkedId, loadingLink, offset])

  if (loadingLink) return <p className="text-muted">Consultando ficha vinculada…</p>
  if (linkedId) return <Alert tone="success">Esta cuenta ya está vinculada a una ficha de empleado. Sus datos se administran desde Legajo.</Alert>

  const update = (patch: Partial<FichaForm>) => onChange({ ...value, ...patch })
  return <div className="form-stack">
    <h3>Ficha de empleado</h3>
    <p className="text-muted">Vincula una ficha de contratación o importación, o registra una nueva. Así aparecerá en Legajo, Contratos y las funciones personales.</p>
    <div className="check-grid">
      <label className="check-label"><input type="radio" name="ficha-mode" checked={value.mode === 'existente'} onChange={() => update({ mode: 'existente' })} /> Vincular ficha existente</label>
      <label className="check-label"><input type="radio" name="ficha-mode" checked={value.mode === 'nueva'} onChange={() => update({ mode: 'nueva' })} /> Crear ficha nueva</label>
    </div>
    {value.mode === 'existente' ? <>
      <Field label="Empleado"><select value={value.empleado_id} onChange={event => update({ empleado_id: event.target.value })} required disabled={loading}>
        <option value="">{loading ? 'Cargando fichas…' : 'Selecciona una ficha'}</option>
        {empleados.map(empleado => <option key={empleado.id} value={empleado.id}>{empleado.codigo} — {nombreCompleto(empleado)}</option>)}
      </select></Field>
      {error && <Alert tone="error">{error}</Alert>}
      {more && <Button variant="secondary" size="sm" disabled={loading} onClick={() => setOffset(value => value + 100)}>Cargar más fichas</Button>}
      {!loading && !error && empleados.length === 0 && <p className="text-muted">No hay fichas. Elige «Crear ficha nueva».</p>}
    </> : <div className="form-grid">
      {([['codigo', 'Código'], ['nombres', 'Nombres'], ['apellido_paterno', 'Apellido paterno'], ['apellido_materno', 'Apellido materno'], ['ci', 'Número de CI'], ['ci_expedido', 'Expedido en']] as const).map(([key, label]) =>
        <Field key={key} label={label}><input value={value[key]} onChange={event => update({ [key]: event.target.value })} required={key !== 'apellido_materno'} /></Field>)}
      <Field label="Fecha de ingreso"><input type="date" value={value.fecha_ingreso} onChange={event => update({ fecha_ingreso: event.target.value })} required /></Field>
    </div>}
  </div>
}
