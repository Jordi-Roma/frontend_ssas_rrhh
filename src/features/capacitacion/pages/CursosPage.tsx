import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Plus, Trash2, Upload } from 'lucide-react'
import { useAccess } from '../../../app/access/AccessProvider'
import { useCompanyScope } from '../../../app/context/CompanyScopeContext'
import { downloadFile } from '../../../shared/api/httpClient'
import { Alert, Button, EmptyState, Field, PageHeader, Panel } from '../../../shared/components'
import { capacitacionApi, type Curso, type CursoInput, type Leccion, type LeccionInput, type LeccionTipo } from '../api/capacitacionApi'
import './sprint4.css'

const emptyCourse: CursoInput = { titulo: '', descripcion: '', categoria: '', duracion_horas: null, es_obligatorio: false, imagen_url: null, instructor: '', nota_minima: 70 }
const emptyLesson: LeccionInput = { titulo: '', tipo: 'VIDEO', orden: 1, duracion_minutos: null, contenido_url: null, contenido_texto: null }
const types: LeccionTipo[] = ['VIDEO', 'DOCUMENTO', 'MANUAL', 'QUIZ', 'ENLACE']
const errorText = (cause: unknown) => cause instanceof Error ? cause.message : 'No se pudo completar la operación.'
type Question = { enunciado: string; opciones: string[]; correcta: number }
const emptyQuestion = (): Question => ({ enunciado: '', opciones: ['', ''], correcta: 0 })
function readQuestions(content: string | null): Question[] {
  try { return (JSON.parse(content || '{}') as { preguntas?: Question[] }).preguntas ?? [emptyQuestion()] }
  catch { return [emptyQuestion()] }
}

export function CursosPage() {
  const { selectedCompanyId, loading: scopeLoading } = useCompanyScope()
  const { can } = useAccess()
  const canManage = can('capacitacion:gestionar', 'platform:capacitacion:gestionar')
  const [courses, setCourses] = useState<Curso[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [lessons, setLessons] = useState<Leccion[]>([])
  const [courseForm, setCourseForm] = useState<CursoInput>(emptyCourse)
  const [lessonForm, setLessonForm] = useState<LeccionInput>(emptyLesson)
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [questions, setQuestions] = useState<Question[]>([emptyQuestion()])
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const selected = courses.find(item => item.id === selectedId) ?? null

  const loadCourses = useCallback(async (keepId?: string | null) => {
    if (!selectedCompanyId) return
    setLoading(true); setError(null)
    try {
      const result = await capacitacionApi.cursos(selectedCompanyId)
      setCourses(result)
      setSelectedId(keepId && result.some(item => item.id === keepId) ? keepId : result[0]?.id ?? null)
    } catch (cause) { setError(errorText(cause)) }
    finally { setLoading(false) }
  }, [selectedCompanyId])

  useEffect(() => { void loadCourses() }, [loadCourses])
  useEffect(() => {
    if (!selected) { setCourseForm(emptyCourse); setLessons([]); return }
    setCourseForm({ titulo: selected.titulo, descripcion: selected.descripcion, categoria: selected.categoria, duracion_horas: selected.duracion_horas, es_obligatorio: selected.es_obligatorio, imagen_url: selected.imagen_url, instructor: selected.instructor, nota_minima: selected.nota_minima })
    setEditingLessonId(null); setFile(null); setQuestions([emptyQuestion()]); setLessonForm({ ...emptyLesson, orden: 1 })
    let active = true
    setLessons([])
    capacitacionApi.lecciones(selected.id, selectedCompanyId).then(items => {
      if (active) { setLessons(items); setLessonForm({ ...emptyLesson, orden: Math.max(0, ...items.map(item => item.orden)) + 1 }) }
    }).catch(cause => { if (active) setError(errorText(cause)) })
    return () => { active = false }
  }, [selectedId, selectedCompanyId, selected?.estado])

  async function saveCourse() {
    if (!selectedCompanyId || !canManage) return
    if (!courseForm.titulo.trim()) { setError('Escribe el título del curso.'); return }
    setBusy(true); setError(null); setNotice(null)
    try {
      const body = { ...courseForm, titulo: courseForm.titulo.trim() }
      const saved = selected ? await capacitacionApi.editarCurso(selected.id, body, selectedCompanyId) : await capacitacionApi.crearCurso(body, selectedCompanyId)
      await loadCourses(saved.id)
      setNotice(selected ? 'Curso actualizado.' : 'Curso creado. Ahora agrega sus lecciones.')
    } catch (cause) { setError(errorText(cause)) }
    finally { setBusy(false) }
  }

  async function saveLesson() {
    if (!selected || !selectedCompanyId || !canManage) return
    if (!lessonForm.titulo.trim()) { setError('Escribe el título de la lección.'); return }
    if (!lessonForm.orden || lessonForm.orden < 1) { setError('El orden debe ser mayor a cero.'); return }
    if (lessons.some(item => item.orden === lessonForm.orden && item.id !== editingLessonId)) { setError('Ya existe una lección con ese orden.'); return }
    if (file && !['application/pdf', 'video/mp4', 'image/png', 'image/jpeg'].includes(file.type)) { setError('Usa PDF, MP4, PNG o JPG.'); return }
    if (file && file.size > 20 * 1024 * 1024) { setError('El archivo no puede superar 20 MB.'); return }
    setBusy(true); setError(null); setNotice(null)
    try {
      let contenido_url = lessonForm.contenido_url
      if (file) contenido_url = (await capacitacionApi.subirMaterial(file, selectedCompanyId)).contenido_url
      const body = { ...lessonForm, titulo: lessonForm.titulo.trim(), contenido_url, contenido_texto: lessonForm.tipo === 'QUIZ' ? JSON.stringify({ preguntas: questions }) : lessonForm.contenido_texto }
      if (!body.contenido_url && !body.contenido_texto?.trim()) throw new Error('Agrega un archivo, enlace o contenido de texto.')
      if (body.tipo === 'QUIZ' && questions.some(q => !q.enunciado.trim() || q.opciones.length < 2 || q.opciones.some(option => !option.trim()) || q.correcta < 0 || q.correcta >= q.opciones.length)) throw new Error('Completa el enunciado, todas las opciones y la respuesta correcta de cada pregunta.')
      if (editingLessonId) await capacitacionApi.editarLeccion(editingLessonId, body, selectedCompanyId)
      else await capacitacionApi.crearLeccion(selected.id, body, selectedCompanyId)
      const updated = await capacitacionApi.lecciones(selected.id, selectedCompanyId)
      setLessons(updated); setLessonForm({ ...emptyLesson, orden: Math.max(0, ...updated.map(item => item.orden)) + 1 }); setEditingLessonId(null); setFile(null); setQuestions([emptyQuestion()])
      setNotice('Lección guardada.')
    } catch (cause) { setError(errorText(cause)) }
    finally { setBusy(false) }
  }

  async function publish() {
    if (!selected || !selectedCompanyId || !window.confirm(`¿Publicar “${selected.titulo}”? Después no podrás editarlo.`)) return
    setBusy(true); setError(null)
    try { await capacitacionApi.publicarCurso(selected.id, selectedCompanyId); await loadCourses(selected.id); setNotice('Curso publicado.') }
    catch (cause) { setError(errorText(cause)) }
    finally { setBusy(false) }
  }
  async function removeCourse() {
    if (!selected || !selectedCompanyId || !window.confirm(`¿Eliminar el borrador “${selected.titulo}”?`)) return
    setBusy(true); setError(null)
    try { await capacitacionApi.borrarCurso(selected.id, selectedCompanyId); await loadCourses(); setNotice('Borrador eliminado.') }
    catch (cause) { setError(errorText(cause)) }
    finally { setBusy(false) }
  }
  async function removeLesson(id: string) {
    if (!selected || !selectedCompanyId || !window.confirm('¿Eliminar esta lección?')) return
    setBusy(true); setError(null)
    try { await capacitacionApi.borrarLeccion(id, selectedCompanyId); setLessons(await capacitacionApi.lecciones(selected.id, selectedCompanyId)); setNotice('Lección eliminada.') }
    catch (cause) { setError(errorText(cause)) }
    finally { setBusy(false) }
  }

  if (!selectedCompanyId && !scopeLoading) return <EmptyState title="Selecciona una empresa" message="El catálogo de capacitación pertenece a la empresa activa." />
  return <section className="page-stack sprint4-page">
    <PageHeader eyebrow="Capacitación" title="Catálogo de cursos" description="Organiza cursos, materiales y lecciones antes de publicarlos." />
    {error && <Alert tone="error">{error} <Button size="sm" variant="secondary" onClick={() => void loadCourses(selectedId)}>Reintentar</Button></Alert>}
    {notice && <Alert tone="success">{notice}</Alert>}
    <div className="sprint4-catalog">
      <Panel title="Cursos" count={`${courses.length} registrados`} actions={canManage ? <Button size="sm" variant="secondary" onClick={() => { setSelectedId(null); setCourseForm(emptyCourse); setLessons([]); setError(null); setNotice(null) }}><Plus size={16} />Nuevo</Button> : undefined}>
        {loading ? <p role="status">Cargando cursos…</p> : courses.length === 0 ? <EmptyState title="Todavía no hay cursos" message="Crea el primero para empezar a añadir lecciones." /> : <div className="sprint4-course-list">{courses.map(item => <button key={item.id} type="button" className={`sprint4-course-item ${item.id === selectedId ? 'active' : ''}`} onClick={() => { setSelectedId(item.id); setError(null); setNotice(null) }}><BookOpen size={18} /><span><strong>{item.titulo}</strong><small>{item.categoria || 'Sin categoría'} · {item.estado === 'PUBLICADO' ? 'Publicado' : 'Borrador'}</small></span></button>)}</div>}
      </Panel>
      <div className="page-stack">
        {canManage && (!selected || selected.estado === 'BORRADOR') && <Panel title={selected ? 'Editar curso' : 'Nuevo curso'} eyebrow="Información general">
          <div className="form-grid"><Field label="Título *"><input maxLength={200} value={courseForm.titulo} onChange={e => setCourseForm(v => ({ ...v, titulo: e.target.value }))} /></Field><Field label="Categoría"><input maxLength={100} value={courseForm.categoria ?? ''} onChange={e => setCourseForm(v => ({ ...v, categoria: e.target.value }))} /></Field><Field label="Instructor"><input maxLength={160} value={courseForm.instructor ?? ''} onChange={e => setCourseForm(v => ({ ...v, instructor: e.target.value }))} /></Field><Field label="Duración (horas)"><input type="number" min="0" step="0.5" value={courseForm.duracion_horas ?? ''} onChange={e => setCourseForm(v => ({ ...v, duracion_horas: e.target.value ? Number(e.target.value) : null }))} /></Field><Field label="Nota mínima"><input type="number" min="0" max="100" value={courseForm.nota_minima} onChange={e => setCourseForm(v => ({ ...v, nota_minima: Number(e.target.value) }))} /></Field></div>
          <Field label="Descripción"><textarea rows={3} value={courseForm.descripcion ?? ''} onChange={e => setCourseForm(v => ({ ...v, descripcion: e.target.value }))} /></Field>
          <label className="check-label"><input type="checkbox" checked={courseForm.es_obligatorio} onChange={e => setCourseForm(v => ({ ...v, es_obligatorio: e.target.checked }))} />Obligatorio</label>
          <div className="form-actions"><Button loading={busy} onClick={() => void saveCourse()}>{selected ? 'Guardar cambios' : 'Crear curso'}</Button>{selected && <Button variant="danger-outline" disabled={busy} onClick={() => void removeCourse()}><Trash2 size={15} />Eliminar borrador</Button>}</div>
        </Panel>}
        {selected && <Panel title={selected.titulo} eyebrow={selected.estado === 'PUBLICADO' ? 'Curso publicado' : 'Lecciones'} actions={selected.estado === 'BORRADOR' && canManage ? <Button size="sm" disabled={busy || lessons.length === 0} onClick={() => void publish()}>Publicar curso</Button> : selected.estado === 'PUBLICADO' && canManage ? <Link to="/capacitacion/seguimiento">Asignar curso →</Link> : undefined}>
          {selected.estado === 'PUBLICADO' && <p className="text-muted">{selected.descripcion || 'Sin descripción.'} {selected.es_obligatorio ? '· Obligatorio' : ''}</p>}
          {lessons.length === 0 ? <EmptyState title="Sin lecciones" message="Agrega al menos una lección para publicar el curso." /> : <ol className="sprint4-lesson-list">{lessons.map(item => <li key={item.id}><span className="sprint4-lesson-number">{item.orden}</span><span><strong>{item.titulo}</strong><small>{item.tipo} {item.duracion_minutos != null ? `· ${item.duracion_minutos} min` : ''}</small></span>{item.contenido_url && (item.contenido_url.startsWith('/api/') ? <Button size="sm" variant="secondary" onClick={() => void downloadFile(`${item.contenido_url}${selectedCompanyId ? `?empresa_id=${encodeURIComponent(selectedCompanyId)}` : ''}`, `${item.titulo}.${item.tipo === 'VIDEO' ? 'mp4' : 'pdf'}`).catch(cause => setError(errorText(cause)))}>Material</Button> : <a href={item.contenido_url} target="_blank" rel="noreferrer">Abrir recurso</a>)}{canManage && selected.estado === 'BORRADOR' && <div className="row-actions"><Button size="sm" variant="quiet" onClick={() => { setEditingLessonId(item.id); setLessonForm({ titulo: item.titulo, tipo: item.tipo, orden: item.orden, duracion_minutos: item.duracion_minutos, contenido_url: item.contenido_url, contenido_texto: item.contenido_texto }); setQuestions(item.tipo === 'QUIZ' ? readQuestions(item.contenido_texto) : [emptyQuestion()]); setFile(null) }}>Editar</Button><Button size="sm" variant="danger-outline" disabled={busy} onClick={() => void removeLesson(item.id)}>Eliminar</Button></div>}</li>)}</ol>}
        </Panel>}
        {selected?.estado === 'BORRADOR' && canManage && <Panel title={editingLessonId ? 'Editar lección' : 'Agregar lección'} eyebrow="Contenido del curso">
          <div className="form-grid"><Field label="Título *"><input maxLength={200} value={lessonForm.titulo} onChange={e => setLessonForm(v => ({ ...v, titulo: e.target.value }))} /></Field><Field label="Tipo"><select value={lessonForm.tipo} onChange={e => { setLessonForm(v => ({ ...v, tipo: e.target.value as LeccionTipo })); setFile(null) }}>{types.map(type => <option key={type} value={type}>{type}</option>)}</select></Field><Field label="Orden"><input type="number" min="1" value={lessonForm.orden} onChange={e => setLessonForm(v => ({ ...v, orden: Number(e.target.value) }))} /></Field><Field label="Duración (minutos)"><input type="number" min="0" value={lessonForm.duracion_minutos ?? ''} onChange={e => setLessonForm(v => ({ ...v, duracion_minutos: e.target.value ? Number(e.target.value) : null }))} /></Field></div>
          {lessonForm.tipo !== 'QUIZ' && <Field label={lessonForm.tipo === 'ENLACE' ? 'URL del recurso *' : 'URL del recurso (opcional si subes archivo)'}><input type="url" value={lessonForm.contenido_url ?? ''} onChange={e => setLessonForm(v => ({ ...v, contenido_url: e.target.value || null }))} placeholder="https://…" /></Field>}
          {lessonForm.tipo !== 'ENLACE' && lessonForm.tipo !== 'QUIZ' && <Field label="Material PDF, MP4, PNG o JPG (máximo 20 MB)"><input type="file" accept=".pdf,.mp4,.png,.jpg,.jpeg" onChange={e => setFile(e.target.files?.[0] ?? null)} /></Field>}
          {lessonForm.tipo === 'QUIZ' ? <div className="sprint4-questions"><h3>Preguntas del cuestionario</h3>{questions.map((question, index) => <div className="sprint4-question" key={index}><div className="panel-heading"><strong>Pregunta {index + 1}</strong>{questions.length > 1 && <Button size="sm" variant="danger-outline" onClick={() => setQuestions(current => current.filter((_, i) => i !== index))}>Quitar</Button>}</div><Field label="Enunciado"><input value={question.enunciado} onChange={e => setQuestions(current => current.map((q, i) => i === index ? { ...q, enunciado: e.target.value } : q))} /></Field>{question.opciones.map((option, optionIndex) => <Field key={optionIndex} label={`Opción ${optionIndex + 1}${question.correcta === optionIndex ? ' · correcta' : ''}`}><div className="sprint4-option"><input value={option} onChange={e => setQuestions(current => current.map((q, i) => i === index ? { ...q, opciones: q.opciones.map((v, j) => j === optionIndex ? e.target.value : v) } : q))} /><input type="radio" name={`correcta-${index}`} checked={question.correcta === optionIndex} aria-label={`Marcar opción ${optionIndex + 1} como correcta`} onChange={() => setQuestions(current => current.map((q, i) => i === index ? { ...q, correcta: optionIndex } : q))} /></div></Field>)}<Button size="sm" variant="secondary" onClick={() => setQuestions(current => current.map((q, i) => i === index ? { ...q, opciones: [...q.opciones, ''] } : q))}>Añadir opción</Button></div>)}<Button size="sm" variant="secondary" onClick={() => setQuestions(current => [...current, emptyQuestion()])}>Añadir pregunta</Button></div> : lessonForm.tipo !== 'ENLACE' && <Field label="Contenido de texto (opcional)"><textarea rows={3} value={lessonForm.contenido_texto ?? ''} onChange={e => setLessonForm(v => ({ ...v, contenido_texto: e.target.value || null }))} /></Field>}
          <div className="form-actions"><Button loading={busy} onClick={() => void saveLesson()}><Upload size={16} />{editingLessonId ? 'Guardar lección' : 'Agregar lección'}</Button>{editingLessonId && <Button variant="secondary" onClick={() => { setEditingLessonId(null); setLessonForm({ ...emptyLesson, orden: Math.max(0, ...lessons.map(item => item.orden)) + 1 }); setFile(null) }}>Cancelar</Button>}</div>
        </Panel>}
      </div>
    </div>
  </section>
}
