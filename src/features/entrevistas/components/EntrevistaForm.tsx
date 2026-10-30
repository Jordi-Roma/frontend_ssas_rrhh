import { useState, type FormEvent } from 'react'
import { CalendarCheck } from 'lucide-react'
import { Alert, Button, Field } from '../../../shared/components'
import { ApiError } from '../../../shared/api/httpClient'
import { MODALIDADES_ENTREVISTA, TIPOS_ENTREVISTA, actualizarEntrevista, crearEntrevista, fechaLocal, type Entrevista, type Entrevistador, type PostulacionOpcion, type TipoEntrevista, type ModalidadEntrevista } from '../api/entrevistasApi'

type Props = { entrevista?: Entrevista | null; postulacionId?: string; entrevistadores: Entrevistador[]; postulaciones: PostulacionOpcion[]; empresaId?: string; onSaved: () => Promise<void>; onCancel: () => void }
export function EntrevistaForm({ entrevista, postulacionId, entrevistadores, postulaciones, empresaId, onSaved, onCancel }: Props) {
  const [form, setForm] = useState({ postulacion_id: entrevista?.postulacion_id ?? postulacionId ?? '', entrevistador_id: entrevista?.entrevistador_id ?? '', tipo: entrevista?.tipo ?? 'TECNICA' as TipoEntrevista, fecha_hora: entrevista ? fechaLocal(entrevista.fecha_hora) : '', duracion_min: String(entrevista?.duracion_min ?? 45), modalidad: entrevista?.modalidad ?? 'VIRTUAL' as ModalidadEntrevista, enlace_reunion: entrevista?.enlace_reunion ?? '', lugar: entrevista?.lugar ?? '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (saving) return
    const issues: Record<string, string> = {}
    if (!form.postulacion_id) issues.postulacion_id = 'Selecciona la postulación.'
    if (!form.entrevistador_id) issues.entrevistador_id = 'Selecciona el entrevistador.'
    if (!form.fecha_hora || !Number.isFinite(new Date(form.fecha_hora).getTime()) || new Date(form.fecha_hora) <= new Date()) issues.fecha_hora = 'Selecciona una fecha futura.'
    if (!Number.isInteger(Number(form.duracion_min)) || Number(form.duracion_min) <= 0 || Number(form.duracion_min) > 480) issues.duracion_min = 'La duración debe estar entre 1 y 480 minutos.'
    if (form.modalidad === 'VIRTUAL') {
      try { if (new URL(form.enlace_reunion).protocol !== 'https:') throw new Error() } catch { issues.enlace_reunion = 'Ingresa un enlace HTTPS válido.' }
    }
    if (form.modalidad === 'PRESENCIAL' && !form.lugar.trim()) issues.lugar = 'El lugar es obligatorio.'
    setErrors(issues)
    if (Object.keys(issues).length) return
    setSaving(true); setError('')
    try {
      const payload = { ...form, fecha_hora: new Date(form.fecha_hora).toISOString(), duracion_min: Number(form.duracion_min), enlace_reunion: form.modalidad === 'VIRTUAL' ? form.enlace_reunion.trim() : '', lugar: form.modalidad === 'PRESENCIAL' ? form.lugar.trim() : '' }
      if (entrevista) await actualizarEntrevista(entrevista.id, payload, empresaId)
      else await crearEntrevista(payload, empresaId)
      await onSaved()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo guardar la entrevista.'); if (cause instanceof ApiError) setErrors(cause.fieldErrors) }
    finally { setSaving(false) }
  }
  return <form className="form-stack" onSubmit={submit}>
    {error && <Alert tone="error">{error}</Alert>}
    <div className="form-grid">
      <Field label="Postulación" error={errors.postulacion_id}><select required value={form.postulacion_id} onChange={e => setForm({ ...form, postulacion_id: e.target.value })}><option value="">Seleccionar</option>{postulaciones.map(p => <option key={p.id} value={p.id}>{p.nombre_postulante} · {p.vacante}</option>)}{entrevista && !postulaciones.some(p => p.id === entrevista.postulacion_id) && <option value={entrevista.postulacion_id}>{entrevista.nombre_postulante ?? entrevista.postulacion_id}</option>}</select></Field>
      <Field label="Entrevistador" error={errors.entrevistador_id}><select required value={form.entrevistador_id} onChange={e => setForm({ ...form, entrevistador_id: e.target.value })}><option value="">Seleccionar</option>{entrevistadores.map(u => <option key={u.id} value={u.id}>{u.nombre} ({u.rol})</option>)}</select></Field>
      <Field label="Tipo"><select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value as TipoEntrevista })}>{TIPOS_ENTREVISTA.map(t => <option key={t}>{t}</option>)}</select></Field>
      <Field label="Fecha y hora" error={errors.fecha_hora}><input required type="datetime-local" value={form.fecha_hora} onChange={e => setForm({ ...form, fecha_hora: e.target.value })} /></Field>
      <Field label="Duración (minutos)" error={errors.duracion_min}><input required type="number" min={1} step={1} value={form.duracion_min} onChange={e => setForm({ ...form, duracion_min: e.target.value })} /></Field>
      <Field label="Modalidad"><select value={form.modalidad} onChange={e => setForm({ ...form, modalidad: e.target.value as ModalidadEntrevista })}>{MODALIDADES_ENTREVISTA.map(m => <option key={m}>{m}</option>)}</select></Field>
    </div>
    {form.modalidad === 'VIRTUAL' && <Field label="Enlace de reunión" error={errors.enlace_reunion}><input required type="url" value={form.enlace_reunion} onChange={e => setForm({ ...form, enlace_reunion: e.target.value })} /></Field>}
    {form.modalidad === 'PRESENCIAL' && <Field label="Lugar" error={errors.lugar}><input required value={form.lugar} onChange={e => setForm({ ...form, lugar: e.target.value })} /></Field>}
    <div className="form-actions"><Button variant="ghost" onClick={onCancel} disabled={saving}>Cancelar</Button><Button type="submit" loading={saving}><CalendarCheck size={16} /> {entrevista ? 'Guardar cambios' : 'Programar entrevista'}</Button></div>
  </form>
}
