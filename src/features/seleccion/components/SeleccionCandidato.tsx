import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BrainCircuit, Pencil, Plus } from 'lucide-react'
import { useAccess } from '../../../app/access/AccessProvider'
import { Alert, Button, DataTable, LoadingBlock, Modal } from '../../../shared/components'
import { ResultadoForm } from '../../entrevistas/components/ResultadoForm'
import type { Entrevista } from '../../entrevistas/api/entrevistasApi'
import { analizarCV, getAnalisis, getEvaluaciones, getEntrevistasCandidato, type AnalisisCV, type Evaluacion } from '../api/seleccionApi'
import { EvaluacionForm } from './EvaluacionForm'

export function SeleccionCandidato({ postulacionId, empresaId, onChanged }: { postulacionId: string; empresaId?: string; onChanged: () => void }) {
  const { can } = useAccess()
  const verEvaluaciones = can('evaluaciones:ver', 'platform:evaluaciones:ver')
  const gestionarEvaluaciones = can('evaluaciones:gestionar', 'platform:evaluaciones:gestionar')
  const verEntrevistas = can('entrevistas:ver', 'platform:entrevistas:ver')
  const [analisis, setAnalisis] = useState<AnalisisCV[]>([])
  const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([])
  const [entrevistas, setEntrevistas] = useState<Entrevista[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [editing, setEditing] = useState<Evaluacion | null | undefined>(undefined)
  const [resultado, setResultado] = useState<Entrevista | null>(null)
  const [reload, setReload] = useState(0)
  useEffect(() => {
    let active = true
    setLoading(true); setErrors({})
    const requests = [
      getAnalisis(postulacionId, empresaId).then(data => { if (active) setAnalisis(data) }).catch(cause => { if (active) setErrors(v => ({ ...v, analisis: cause instanceof Error ? cause.message : 'No se pudo cargar el análisis.' })) }),
      ...(verEvaluaciones ? [getEvaluaciones(postulacionId, empresaId).then(data => { if (active) setEvaluaciones(data) }).catch(cause => { if (active) setErrors(v => ({ ...v, evaluaciones: cause instanceof Error ? cause.message : 'No se pudieron cargar las evaluaciones.' })) })] : []),
      ...(verEntrevistas ? [getEntrevistasCandidato(postulacionId, empresaId).then(data => { if (active) setEntrevistas(data) }).catch(cause => { if (active) setErrors(v => ({ ...v, entrevistas: cause instanceof Error ? cause.message : 'No se pudieron cargar las entrevistas.' })) })] : []),
    ]
    void Promise.all(requests).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [postulacionId, empresaId, verEvaluaciones, verEntrevistas, reload])
  async function ejecutar() {
    if (processing) return
    setProcessing(true); setErrors(v => ({ ...v, proceso: '' }))
    try { const result = await analizarCV(postulacionId, empresaId); setAnalisis(v => [result, ...v]); onChanged() }
    catch (cause) { setErrors(v => ({ ...v, proceso: cause instanceof Error ? cause.message : 'No se pudo analizar el CV.' })) }
    finally { setProcessing(false) }
  }
  async function saved() { setEditing(undefined); setResultado(null); setReload(n => n + 1); onChanged() }
  const latest = analisis[0]
  return <section className="page-stack">
    <div className="page-header"><h3>Análisis de CV</h3>{can('postulaciones:analizar_cv', 'platform:postulaciones:analizar_cv') && <Button size="sm" loading={processing} onClick={() => void ejecutar()}><BrainCircuit size={16} /> {latest ? 'Reanalizar CV' : 'Analizar CV'}</Button>}</div>
    {loading && <LoadingBlock message="Cargando selección…" />}
    {errors.proceso && <Alert tone="error">{errors.proceso}</Alert>}
    {errors.analisis ? <Alert tone="error">{errors.analisis}<Button variant="ghost" onClick={() => setReload(n => n + 1)}>Reintentar</Button></Alert> : latest ? <>
      <p><strong>Afinidad: {latest.puntaje_afinidad}%</strong> · {new Date(latest.fecha_analisis).toLocaleString('es-BO')} · {latest.modelo_usado}</p>
      <p>{latest.resumen_ia}</p>
      <dl className="info-list"><dt>Experiencia detectada</dt><dd>{latest.anios_experiencia_detectados ?? 'Sin información'}</dd><dt>Habilidades detectadas</dt><dd>{latest.habilidades_detectadas.join(', ') || 'Sin información'}</dd><dt>Habilidades faltantes</dt><dd>{latest.habilidades_faltantes.join(', ') || 'Ninguna identificada'}</dd><dt>Fortalezas</dt><dd>{latest.fortalezas.join(', ') || 'Sin información'}</dd></dl>
      {latest.observaciones && <p>{latest.observaciones}</p>}
      {analisis.length > 1 && <details><summary>Análisis anteriores ({analisis.length - 1})</summary>{analisis.slice(1).map(a => <p key={a.id}>{new Date(a.fecha_analisis).toLocaleString('es-BO')} · {a.puntaje_afinidad}% · {a.modelo_usado}<br />{a.resumen_ia}</p>)}</details>}
    </> : !loading && <p className="text-muted">Sin análisis de CV.</p>}
    {verEntrevistas && <>
      <div className="page-header"><h3>Entrevistas</h3>{can('entrevistas:gestionar', 'platform:entrevistas:gestionar') && <Link className="button button-secondary" to={`/entrevistas?postulacion=${postulacionId}`}>Programar entrevista</Link>}</div>
      <DataTable rows={entrevistas} rowKey={e => e.id} loading={loading} error={errors.entrevistas} onRetry={() => setReload(n => n + 1)} columns={[
        { key: 'tipo', header: 'Tipo / estado', render: e => `${e.tipo} · ${e.estado}` },
        { key: 'fecha', header: 'Fecha', render: e => new Date(e.fecha_hora).toLocaleString('es-BO') },
        { key: 'responsable', header: 'Responsable', render: e => e.entrevistador_nombre ?? e.entrevistador_id },
        { key: 'resultado', header: 'Resultado', render: e => <>{e.puntaje == null ? 'Sin resultado' : `${e.puntaje}/100`} · {e.recomendacion}<p>{e.observaciones}</p></> },
        { key: 'acciones', header: '', render: e => e.estado !== 'CANCELADA' && can('entrevistas:registrar_resultado', 'platform:entrevistas:registrar_resultado') && <Button variant="ghost" title="Registrar resultado" aria-label="Registrar resultado" onClick={() => setResultado(e)}><Pencil size={16} /></Button> },
      ]} />
    </>}
    {(verEvaluaciones || gestionarEvaluaciones) && <div className="page-header"><h3>Evaluaciones</h3>{gestionarEvaluaciones && <Button size="sm" onClick={() => setEditing(null)}><Plus size={16} /> Registrar evaluación</Button>}</div>}
    {verEvaluaciones && <DataTable rows={evaluaciones} rowKey={e => e.id} loading={loading} error={errors.evaluaciones} onRetry={() => setReload(n => n + 1)} columns={[
      { key: 'nombre', header: 'Evaluación', render: e => <>{e.nombre} · {e.tipo}<p>{e.observaciones}</p></> },
      { key: 'puntaje', header: 'Puntaje', render: e => `${e.puntaje}/${e.puntaje_maximo}` },
      { key: 'dictamen', header: 'Dictamen', render: e => e.aprobado == null ? 'Sin dictamen' : e.aprobado ? 'Aprobado' : 'No aprobado' },
      { key: 'responsable', header: 'Responsable / fecha', render: e => `${e.evaluador_nombre ?? e.evaluador_id} · ${new Date(e.fecha).toLocaleDateString('es-BO')}` },
      { key: 'acciones', header: '', render: e => gestionarEvaluaciones && <Button variant="ghost" title="Corregir evaluación" aria-label="Corregir evaluación" onClick={() => setEditing(e)}><Pencil size={16} /></Button> },
    ]} />}
    {editing !== undefined && gestionarEvaluaciones && <Modal title={editing ? 'Corregir evaluación' : 'Registrar evaluación'} onClose={() => setEditing(undefined)}><EvaluacionForm postulacionId={postulacionId} empresaId={empresaId} evaluacion={editing ?? undefined} onSaved={saved} /></Modal>}
    {resultado && <Modal title="Resultado de entrevista" onClose={() => setResultado(null)}><ResultadoForm entrevista={resultado} empresaId={empresaId} onSaved={saved} /></Modal>}
  </section>
}
