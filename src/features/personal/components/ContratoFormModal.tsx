import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Can, useAccess } from '../../../app/access/AccessProvider'
import { nombreCompleto, type Empleado } from '../../../shared/api/empleadosApi'
import { ApiError } from '../../../shared/api/httpClient'
import { getCargos, getDepartamentos } from '../../../shared/api/organizacionCatalogosApi'
import { Alert, Button, EmpleadoPicker, Field, LoadingBlock, Modal } from '../../../shared/components'
import { useAsyncResource } from '../../../shared/hooks/useAsyncResource'
import { crearContrato, type Contrato, type CrearContrato } from '../api/contratosApi'

const WRITE = ['personal:gestionar', 'platform:personal:gestionar']

export function ContratoFormModal({ empleado, empresaId, vigente, onClose, onCreated }: {
  empleado: Empleado; empresaId: string; vigente?: Contrato; onClose: () => void; onCreated: () => void
}) {
  const { can } = useAccess()
  const load = useCallback(() => Promise.all([getCargos(empresaId), getDepartamentos(empresaId)]), [empresaId])
  const catalog = useAsyncResource(load)
  const [form, setForm] = useState({
    numero_contrato: '', cargo_id: vigente?.cargo_id ?? '', departamento_id: vigente?.departamento_id ?? '',
    jefe_directo_id: vigente?.jefe_directo_id ?? null as string | null,
    tipo_contrato: vigente?.tipo_contrato ?? 'INDEFINIDO', modalidad: vigente?.modalidad ?? 'PRESENCIAL',
    jornada: vigente?.jornada ?? 'COMPLETA', hora_entrada_programada: vigente?.hora_entrada_programada ?? '08:30',
    horas_jornada: String(vigente?.horas_jornada ?? 8), minutos_descanso: String(vigente?.minutos_descanso ?? 60),
    salario_basico: String(vigente?.salario_basico ?? ''), fecha_inicio: '', fecha_fin: '', motivo_cambio: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])

  function change(name: keyof typeof form, value: string | null) {
    setForm(previous => ({ ...previous, [name]: value }))
    setFieldErrors(previous => ({ ...previous, [name]: '' }))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    if (!can(...WRITE)) { setError('No tienes permiso para registrar contratos.'); return }
    if (![form.numero_contrato, form.tipo_contrato, form.modalidad, form.jornada].every(value => value.trim().length > 0)) {
      setError('Completa el número, tipo de contrato, modalidad y jornada con valores válidos.'); return
    }
    if (form.fecha_fin && form.fecha_fin < form.fecha_inicio) {
      setFieldErrors({ fecha_fin: 'La fecha final precede el inicio' }); return
    }
    const data: CrearContrato = {
      ...form, jefe_directo_id: form.jefe_directo_id || null, fecha_fin: form.fecha_fin || null,
      motivo_cambio: form.motivo_cambio.trim() || null, numero_contrato: form.numero_contrato.trim(),
      tipo_contrato: form.tipo_contrato.trim(), modalidad: form.modalidad.trim(), jornada: form.jornada.trim(),
      minutos_descanso: Number(form.minutos_descanso),
      hora_entrada_programada: form.hora_entrada_programada.length === 5 ? `${form.hora_entrada_programada}:00` : form.hora_entrada_programada,
    }
    setBusy(true); setError(null); setFieldErrors({})
    try {
      await crearContrato(empleado.id, data, empresaId)
      if (alive.current) onCreated()
    } catch (cause) {
      if (!alive.current) return
      setError(cause instanceof ApiError && cause.isForbidden ? `No tienes permiso para registrar contratos. ${cause.message}` : cause instanceof Error ? cause.message : 'No se pudo registrar la versión.')
      if (cause instanceof ApiError) setFieldErrors(cause.fieldErrors)
    } finally { if (alive.current) setBusy(false) }
  }

  const cargos = catalog.data?.[0] ?? []
  const departamentos = catalog.data?.[1] ?? []
  const filtered = cargos.filter(cargo => cargo.departamento_id === null || cargo.departamento_id === form.departamento_id)
  return <Modal title={vigente ? 'Nueva versión de contrato' : 'Registrar contrato'} size="lg" onClose={() => { if (!busy) onClose() }}>
    <p className="text-muted">{empleado.codigo} — {nombreCompleto(empleado)}</p>
    {catalog.loading && <LoadingBlock message="Cargando puestos y departamentos…" />}
    {catalog.error && <Alert tone="error">{catalog.error}<Button variant="secondary" onClick={catalog.reload}>Reintentar catálogos</Button></Alert>}
    <form className="form-stack" onSubmit={event => void submit(event)}>
      <fieldset className="form-section" disabled={busy || catalog.loading || catalog.error !== null}>
        <legend>Identificación</legend>
        <div className="form-grid">
          <Field label="N.º de contrato" error={fieldErrors.numero_contrato}><input required maxLength={80} value={form.numero_contrato} onChange={e => change('numero_contrato', e.target.value)} /></Field>
          <Field label="Motivo del cambio" error={fieldErrors.motivo_cambio}><input value={form.motivo_cambio} onChange={e => change('motivo_cambio', e.target.value)} /></Field>
        </div>
      </fieldset>
      <fieldset className="form-section" disabled={busy || catalog.loading || catalog.error !== null}>
        <legend>Puesto</legend><div className="form-grid">
          <Field label="Departamento" error={fieldErrors.departamento_id}><select required value={form.departamento_id} onChange={e => { change('departamento_id', e.target.value); change('cargo_id', '') }}><option value="">Seleccionar departamento</option>{departamentos.map(item => <option value={item.id} key={item.id}>{item.nombre}</option>)}</select></Field>
          <Field label="Cargo" error={fieldErrors.cargo_id}><select required value={form.cargo_id} onChange={e => change('cargo_id', e.target.value)}><option value="">Seleccionar cargo</option>{filtered.map(item => <option value={item.id} key={item.id}>{item.nombre}</option>)}</select></Field>
          <EmpleadoPicker label="Jefe directo (opcional)" empresaId={empresaId} excludeId={empleado.id} value={form.jefe_directo_id} onChange={id => change('jefe_directo_id', id)} error={fieldErrors.jefe_directo_id} disabled={busy} />
        </div>
      </fieldset>
      <fieldset className="form-section" disabled={busy}>
        <legend>Condiciones</legend><div className="form-grid">
          <Field label="Tipo de contrato" error={fieldErrors.tipo_contrato}><input required maxLength={30} value={form.tipo_contrato} onChange={e => change('tipo_contrato', e.target.value)} /></Field>
          <Field label="Modalidad" error={fieldErrors.modalidad}><input required maxLength={30} value={form.modalidad} onChange={e => change('modalidad', e.target.value)} /></Field>
          <Field label="Jornada" error={fieldErrors.jornada}><input required maxLength={30} value={form.jornada} onChange={e => change('jornada', e.target.value)} /></Field>
          <Field label="Hora de entrada" error={fieldErrors.hora_entrada_programada}><input type="time" step="1" required value={form.hora_entrada_programada} onChange={e => change('hora_entrada_programada', e.target.value)} /></Field>
          <Field label="Horas de jornada" error={fieldErrors.horas_jornada}><input type="number" min="0.01" max="24" step="0.01" required value={form.horas_jornada} onChange={e => change('horas_jornada', e.target.value)} /></Field>
          <Field label="Minutos de descanso" error={fieldErrors.minutos_descanso}><input type="number" min="0" max="240" step="1" required value={form.minutos_descanso} onChange={e => change('minutos_descanso', e.target.value)} /></Field>
          <Field label="Salario básico (Bs)" error={fieldErrors.salario_basico}><input type="number" min="0.01" step="0.01" required value={form.salario_basico} onChange={e => change('salario_basico', e.target.value)} /></Field>
        </div>
      </fieldset>
      <fieldset className="form-section" disabled={busy}><legend>Vigencia</legend><div className="form-grid">
        <Field label="Fecha de inicio" error={fieldErrors.fecha_inicio}><input type="date" min={empleado.fecha_ingreso} required value={form.fecha_inicio} onChange={e => change('fecha_inicio', e.target.value)} /></Field>
        <Field label="Fecha de fin (opcional)" hint="Vacía para un contrato sin fecha de fin." error={fieldErrors.fecha_fin}><input type="date" min={form.fecha_inicio || empleado.fecha_ingreso} value={form.fecha_fin} onChange={e => change('fecha_fin', e.target.value)} /></Field>
      </div>{vigente && <p className="text-muted">Al registrar esta versión, el contrato vigente se cerrará el día anterior a la nueva fecha de inicio. El historial se conserva.</p>}</fieldset>
      <div className="modal-footer">{error && <div className="form-feedback"><Alert tone="error">{error}</Alert></div>}<Button variant="secondary" onClick={onClose} disabled={busy}>Cancelar</Button><Can permisos={WRITE}><Button type="submit" loading={busy} disabled={catalog.loading || catalog.error !== null}>Registrar versión</Button></Can></div>
    </form>
  </Modal>
}
