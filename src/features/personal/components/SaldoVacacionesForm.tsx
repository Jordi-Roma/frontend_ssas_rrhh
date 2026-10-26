import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Can, useAccess } from '../../../app/access/AccessProvider'
import { ApiError } from '../../../shared/api/httpClient'
import { Alert, Button, EmpleadoPicker, Field, Panel } from '../../../shared/components'
import { asignarSaldoVacaciones, type SaldoVacaciones } from '../api/ausenciasApi'

const WRITE = ['ausencias:gestionar', 'platform:ausencias:gestionar']

export function SaldoVacacionesForm({ empresaId }: { empresaId: string }) {
  const { can } = useAccess()
  const [empleadoId, setEmpleadoId] = useState<string | null>(null)
  const [gestion, setGestion] = useState(String(new Date().getFullYear()))
  const [dias, setDias] = useState('')
  const [saldo, setSaldo] = useState<SaldoVacaciones | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || !empleadoId) return
    if (!can(...WRITE)) { setError('No tienes permiso para asignar saldos de vacaciones.'); return }
    const anio = Number(gestion), asignados = Number(dias)
    if (!Number.isInteger(anio) || anio < 2000 || anio > 2100 || !Number.isInteger(asignados) || asignados < 0 || asignados > 365 || dias === '') {
      setError('Revisa la gestión (2000 a 2100) y los días asignados (0 a 365).'); return
    }
    setBusy(true); setError(null); setFieldErrors({}); setSaldo(null)
    try {
      const result = await asignarSaldoVacaciones(empleadoId, anio, { gestion: anio, dias_asignados: asignados }, empresaId)
      if (alive.current) setSaldo(result)
    } catch (cause) {
      if (!alive.current) return
      setError(cause instanceof ApiError && cause.isForbidden ? `No tienes permiso para asignar saldos. ${cause.message}` : cause instanceof Error ? cause.message : 'No se pudo asignar el saldo.')
      if (cause instanceof ApiError) setFieldErrors(cause.fieldErrors)
    } finally { if (alive.current) setBusy(false) }
  }

  return <Panel title="Saldo de vacaciones" eyebrow="Asignación anual">
    <Alert tone="info">El saldo actual no se puede consultar todavía. Los días asignados, usados y disponibles se muestran después de guardar una asignación. Asignar reemplaza el total anual; no añade días al saldo anterior.</Alert>
    <form className="form-stack" onSubmit={event => void submit(event)}>
      <EmpleadoPicker empresaId={empresaId} value={empleadoId} onChange={id => { setEmpleadoId(id); setSaldo(null); setError(null) }} soloActivos={false} disabled={busy} error={fieldErrors.empleado_id} />
      <div className="form-grid">
        <Field label="Gestión" error={fieldErrors.gestion}><input type="number" required min="2000" max="2100" step="1" value={gestion} disabled={busy} onChange={e => { setGestion(e.target.value); setSaldo(null); setError(null) }} /></Field>
        <Field label="Días asignados" error={fieldErrors.dias_asignados}><input type="number" required min="0" max="365" step="1" value={dias} disabled={busy} onChange={e => { setDias(e.target.value); setSaldo(null) }} /></Field>
      </div>
      {error && <Alert tone="error">{error}{error.includes('debajo de lo ya utilizado') && <span>El total asignado debe cubrir los días que el empleado ya usó. Conservamos los valores para que puedas corregirlos.</span>}</Alert>}
      <div className="form-actions"><Can permisos={WRITE}><Button type="submit" loading={busy} disabled={!empleadoId}>Asignar saldo</Button></Can></div>
      {saldo && <div role="status" className="form-stack"><Alert tone="success">Saldo asignado para la gestión {saldo.gestion}.</Alert><dl className="subscription-summary">
        <div><dt>Días asignados</dt><dd>{saldo.dias_asignados}</dd></div><div><dt>Días usados</dt><dd>{saldo.dias_usados}</dd></div><div><dt>Disponibles</dt><dd>{saldo.dias_asignados - saldo.dias_usados}</dd></div>
      </dl></div>}
    </form>
  </Panel>
}
