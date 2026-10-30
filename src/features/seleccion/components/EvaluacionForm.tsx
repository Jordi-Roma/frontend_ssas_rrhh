import { useEffect, useState, type FormEvent } from 'react'
import { Save } from 'lucide-react'
import { ApiError } from '../../../shared/api/httpClient'
import { Alert, Button, Field } from '../../../shared/components'
import { getEvaluadores, guardarEvaluacion, type Evaluacion, type EvaluadorOpcion } from '../api/seleccionApi'
import { useAuth } from '../../auth/hooks/useAuth'

export function EvaluacionForm({ postulacionId, empresaId, evaluacion, onSaved }: { postulacionId: string; empresaId?: string; evaluacion?: Evaluacion; onSaved: () => Promise<void> }) {
  const { user } = useAuth()
  const platform = user?.realm === 'platform'
  const [evaluadorId, setEvaluadorId] = useState(evaluacion?.evaluador_id ?? '')
  const [evaluadores, setEvaluadores] = useState<EvaluadorOpcion[]>([])
  const [form, setForm] = useState({ tipo: evaluacion?.tipo ?? 'TECNICA', nombre: evaluacion?.nombre ?? '', puntaje: String(evaluacion?.puntaje ?? ''), puntaje_maximo: String(evaluacion?.puntaje_maximo ?? 100), aprobado: evaluacion?.aprobado == null ? '' : String(evaluacion.aprobado), observaciones: evaluacion?.observaciones ?? '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fields, setFields] = useState<Record<string, string>>({})
  useEffect(() => {
    if (!platform) return
    let active = true
    getEvaluadores(empresaId).then(data => { if (active) setEvaluadores(data) }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los evaluadores.') })
    return () => { active = false }
  }, [platform, empresaId])
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (saving) return
    const issues: Record<string, string> = {}
    const score = Number(form.puntaje), max = Number(form.puntaje_maximo)
    if (!form.nombre.trim()) issues.nombre = 'Ingresa el nombre.'
    if (!form.tipo.trim()) issues.tipo = 'Ingresa el tipo.'
    if (!Number.isFinite(max) || max <= 0) issues.puntaje_maximo = 'Debe ser positivo.'
    if (!form.puntaje.trim() || !Number.isFinite(score) || score < 0 || score > max) issues.puntaje = 'Debe estar entre cero y el máximo.'
    setFields(issues)
    if (Object.keys(issues).length) return
    setSaving(true); setError('')
    try { await guardarEvaluacion(postulacionId, { tipo: form.tipo.trim(), nombre: form.nombre.trim(), puntaje: score, puntaje_maximo: max, aprobado: form.aprobado === 'true', observaciones: form.observaciones, ...(platform ? { evaluador_id: evaluadorId } : {}) }, empresaId, evaluacion?.id); await onSaved() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo guardar.'); if (cause instanceof ApiError) setFields(cause.fieldErrors) }
    finally { setSaving(false) }
  }
  return <form className="form-stack" onSubmit={submit}>
    {error && <Alert tone="error">{error}</Alert>}
    {platform && <Field label="Evaluador de la empresa" error={fields.evaluador_id}><select required disabled={!!evaluacion} value={evaluadorId} onChange={e => setEvaluadorId(e.target.value)}><option value="">Seleccionar</option>{evaluadores.map(e => <option key={e.id} value={e.id}>{e.nombre} ({e.rol})</option>)}{evaluacion && !evaluadores.some(e => e.id === evaluacion.evaluador_id) && <option value={evaluacion.evaluador_id}>{evaluacion.evaluador_nombre ?? evaluacion.evaluador_id}</option>}</select></Field>}
    <Field label="Nombre" error={fields.nombre}><input required value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} /></Field>
    <Field label="Tipo" error={fields.tipo}><select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>{['TECNICA', 'PSICOMETRICA', 'CONOCIMIENTOS', 'OTRO'].map(t => <option key={t}>{t}</option>)}</select></Field>
    <div className="form-grid"><Field label="Puntaje" error={fields.puntaje}><input required type="number" step="any" min={0} max={form.puntaje_maximo} value={form.puntaje} onChange={e => setForm({ ...form, puntaje: e.target.value })} /></Field><Field label="Puntaje máximo" error={fields.puntaje_maximo}><input required type="number" step="any" min={0.01} value={form.puntaje_maximo} onChange={e => setForm({ ...form, puntaje_maximo: e.target.value })} /></Field></div>
    <Field label="Dictamen" error={fields.aprobado}><select required value={form.aprobado} onChange={e => setForm({ ...form, aprobado: e.target.value })}><option value="">Seleccionar dictamen</option><option value="true">Aprobado</option><option value="false">No aprobado</option></select></Field>
    <Field label="Observaciones" error={fields.observaciones}><textarea rows={3} value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })} /></Field>
    <div className="form-actions"><Button type="submit" loading={saving}><Save size={16} /> Guardar evaluación</Button></div>
  </form>
}
