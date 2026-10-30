import { useEffect, useRef, useState } from 'react'
import { getEmpleado, getEmpleados, nombreCompleto, type Empleado } from '../api/empleadosApi'
import { Alert } from './Alert'
import { Button } from './Button'
import { Field } from './Field'

type Props = {
  value: string | null
  onChange: (id: string | null) => void
  empresaId: string | null
  soloActivos?: boolean
  label?: string
  excludeId?: string
  disabled?: boolean
  error?: string
}

export function EmpleadoPicker(props: Props) {
  const previousCompany = useRef(props.empresaId)
  const changedCompany = previousCompany.current !== props.empresaId
  useEffect(() => {
    if (previousCompany.current !== props.empresaId) {
      previousCompany.current = props.empresaId
      props.onChange(null)
    }
  }, [props.empresaId, props.onChange])
  return <Picker key={props.empresaId} {...props} value={changedCompany ? null : props.value} />
}

function Picker({ value, onChange, empresaId, soloActivos = true, label = 'Empleado', excludeId, disabled, error: fieldError }: Props) {
  const [items, setItems] = useState<Empleado[]>([])
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const [selected, setSelected] = useState<Empleado | null>(null)
  const [selectionError, setSelectionError] = useState<string | null>(null)
  const [selectionRevision, setSelectionRevision] = useState(0)

  useEffect(() => {
    let active = true
    setSelected(null); setSelectionError(null)
    if (!value || items.some(item => item.id === value)) return
    getEmpleado(value, empresaId).then(item => { if (active) setSelected(item) })
      .catch((cause: unknown) => { if (active) setSelectionError(cause instanceof Error ? cause.message : 'No se pudo consultar al empleado seleccionado.') })
    return () => { active = false }
  }, [value, empresaId, items, selectionRevision])
  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    getEmpleados(empresaId, offset, 50).then(page => {
      if (!active) return
      setItems(previous => {
        const merged = new Map((offset === 0 ? [] : previous).map(item => [item.id, item]))
        page.forEach(item => merged.set(item.id, item))
        return [...merged.values()]
      })
      setHasMore(page.length === 50)
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los empleados.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [empresaId, offset, revision])

  const allItems = [...new Map((selected ? [...items, selected] : items).map(item => [item.id, item])).values()]
  const visible = allItems.filter(item => (!soloActivos || item.estado === 'ACTIVO') && item.id !== excludeId)
  return <div className="form-stack">
    <Field label={label} error={fieldError}>
      <select value={value ?? ''} disabled={disabled || loading || (items.length === 0 && error !== null)} onChange={event => onChange(event.target.value || null)}>
        <option value="">{loading ? 'Cargando empleados…' : 'Seleccionar empleado'}</option>
        {value && !visible.some(item => item.id === value) && <option value={value}>Empleado seleccionado · ref. {value}</option>}
        {visible.map(item => <option key={item.id} value={item.id}>{item.codigo} — {nombreCompleto(item)}</option>)}
      </select>
    </Field>
    {error && <Alert tone="error">{error} <Button size="sm" variant="secondary" onClick={() => setRevision(value => value + 1)}>Reintentar empleados</Button></Alert>}
    {selectionError && <Alert tone="error">{selectionError} <Button size="sm" variant="secondary" onClick={() => setSelectionRevision(value => value + 1)}>Reintentar seleccionado</Button></Alert>}
    {!loading && !error && allItems.length === 0 && !value && <p className="text-muted">Esta empresa aún no tiene empleados registrados.</p>}
    {!loading && !error && allItems.length > 0 && visible.length === 0 && <p className="text-muted">No hay empleados elegibles en las páginas cargadas.</p>}
    {hasMore && <Button size="sm" variant="secondary" disabled={loading || error !== null} onClick={() => setOffset(value => value + 50)}>Cargar más empleados</Button>}
  </div>
}
