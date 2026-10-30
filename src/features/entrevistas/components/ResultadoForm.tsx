import { useState, type FormEvent } from 'react'
import { Save } from 'lucide-react'
import { Alert, Button, Field } from '../../../shared/components'
import { ApiError } from '../../../shared/api/httpClient'
import { registrarResultadoEntrevista, type Entrevista } from '../api/entrevistasApi'

export function ResultadoForm({ entrevista, empresaId, onSaved }: { entrevista: Entrevista; empresaId?: string; onSaved: () => Promise<void> }) {
  const [puntaje, setPuntaje] = useState(String(entrevista.puntaje ?? ''))
  const [observaciones, setObservaciones] = useState(entrevista.observaciones ?? '')
  const [recomendacion, setRecomendacion] = useState(entrevista.recomendacion ?? 'RECOMENDADO')
  const [error, setError] = useState('')
  const [fields, setFields] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (saving) return
    if (!puntaje.trim() || !Number.isFinite(Number(puntaje)) || Number(puntaje) < 0 || Number(puntaje) > 100) { setFields({ puntaje: 'El puntaje debe estar entre 0 y 100.' }); return }
    setSaving(true); setError(''); setFields({})
    try { await registrarResultadoEntrevista(entrevista.id, { puntaje: Number(puntaje), observaciones, recomendacion }, empresaId); await onSaved() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo guardar.'); if (cause instanceof ApiError) setFields(cause.fieldErrors) }
    finally { setSaving(false) }
  }
  return <form className="form-stack" onSubmit={submit}>
    {error && <Alert tone="error">{error}</Alert>}
    <Field label="Puntaje / 100" error={fields.puntaje}><input required type="number" min={0} max={100} step="any" value={puntaje} onChange={e => setPuntaje(e.target.value)} /></Field>
    <Field label="Recomendación" error={fields.recomendacion}><select value={recomendacion} onChange={e => setRecomendacion(e.target.value)}>{['RECOMENDADO', 'NO_RECOMENDADO', 'PENDIENTE'].map(r => <option key={r}>{r}</option>)}</select></Field>
    <Field label="Observaciones" error={fields.observaciones}><textarea required maxLength={4000} rows={4} value={observaciones} onChange={e => setObservaciones(e.target.value)} /></Field>
    <div className="form-actions"><Button type="submit" loading={saving}><Save size={16} /> Guardar resultado</Button></div>
  </form>
}
