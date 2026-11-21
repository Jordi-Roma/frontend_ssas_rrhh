import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCompanyScope } from '../../../app/context/CompanyScopeContext'
import { downloadFile } from '../../../shared/api/httpClient'
import { getEmpleados, nombreCompleto, type Empleado } from '../../../shared/api/empleadosApi'
import { getDepartamentos, type Departamento } from '../../../shared/api/organizacionCatalogosApi'
import { Alert, Button, EmpleadoPicker, EmptyState, Field, PageHeader, Panel } from '../../../shared/components'
import { capacitacionApi, type Curso, type Inscripcion } from '../api/capacitacionApi'
import './sprint4.css'

const errorText = (cause: unknown) => cause instanceof Error ? cause.message : 'No se pudo completar la operación.'

export function SeguimientoCursosPage() {
  const { selectedCompanyId, loading: scopeLoading } = useCompanyScope()
  const [courses, setCourses] = useState<Curso[]>([])
  const [courseId, setCourseId] = useState('')
  const [departments, setDepartments] = useState<Departamento[]>([])
  const [employees, setEmployees] = useState<Empleado[]>([])
  const [enrollments, setEnrollments] = useState<Inscripcion[]>([])
  const [targetType, setTargetType] = useState<'empleado' | 'departamento'>('empleado')
  const [employeeId, setEmployeeId] = useState<string | null>(null)
  const [departmentId, setDepartmentId] = useState('')
  const [deadline, setDeadline] = useState('')
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [gradeValues, setGradeValues] = useState<Record<string, string>>({})
  const requestId = useRef(0)
  const selectedCourse = courses.find(item => item.id === courseId)
  const employeesById = useMemo(() => new Map(employees.map(item => [item.id, item])), [employees])

  useEffect(() => {
    if (!selectedCompanyId) return
    let active = true
    setLoading(true); setError(null); setCourses([]); setEnrollments([]); setCourseId('')
    Promise.all([capacitacionApi.cursos(selectedCompanyId), getDepartamentos(selectedCompanyId)])
      .then(([allCourses, allDepartments]) => {
        if (!active) return
        const published = allCourses.filter(item => item.estado === 'PUBLICADO')
        setCourses(published); setCourseId(published[0]?.id ?? '')
        setDepartments(allDepartments); setEmployees([])
      }).catch(cause => { if (active) setError(errorText(cause)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [selectedCompanyId])

  const loadEnrollments = useCallback(async () => {
    const currentRequest = ++requestId.current
    if (!courseId || !selectedCompanyId) { setEnrollments([]); return }
    setLoading(true); setError(null)
    try {
      const items = await capacitacionApi.inscripciones(courseId, selectedCompanyId)
      if (currentRequest !== requestId.current) return
      setEnrollments(items)
      const unresolved = new Set(items.map(item => item.empleado_id))
      const found: Empleado[] = []
      for (let offset = 0; unresolved.size && offset < 1000; offset += 100) {
        const page = await getEmpleados(selectedCompanyId, offset, 100)
        if (currentRequest !== requestId.current) return
        found.push(...page)
        page.forEach(employee => unresolved.delete(employee.id))
        if (page.length < 100) break
      }
      setEmployees(found)
    } catch (cause) { if (currentRequest === requestId.current) setError(errorText(cause)) }
    finally { if (currentRequest === requestId.current) setLoading(false) }
  }, [courseId, selectedCompanyId])

  useEffect(() => { void loadEnrollments() }, [loadEnrollments])

  async function assign() {
    if (!courseId || !selectedCompanyId) return
    if (targetType === 'empleado' && !employeeId || targetType === 'departamento' && !departmentId) { setError('Selecciona un empleado o departamento.'); return }
    setBusy(true); setError(null); setNotice(null)
    try {
      const result = await capacitacionApi.asignar({ curso_id: courseId, ...(targetType === 'empleado' ? { empleado_id: employeeId! } : { departamento_id: departmentId }), fecha_limite: deadline || null }, selectedCompanyId)
      await loadEnrollments()
      setNotice(result.cantidad === 0 ? 'No había empleados nuevos para inscribir en esta selección.' : `${result.cantidad} inscripción${result.cantidad === 1 ? '' : 'es'} creada${result.cantidad === 1 ? '' : 's'}.`)
      setEmployeeId(null); setDepartmentId('')
    } catch (cause) { setError(errorText(cause)) }
    finally { setBusy(false) }
  }

  async function grade(id: string) {
    if (!selectedCompanyId) return
    const value = Number(gradeValues[id])
    if (!Number.isFinite(value) || value < 0 || value > 100 || gradeValues[id]?.trim() === '') { setError('La calificación debe estar entre 0 y 100.'); return }
    setBusy(true); setError(null); setNotice(null)
    try { await capacitacionApi.calificar(id, value, selectedCompanyId); await loadEnrollments(); setNotice('Calificación guardada.') }
    catch (cause) { setError(errorText(cause)) }
    finally { setBusy(false) }
  }

  if (!selectedCompanyId && !scopeLoading) return <EmptyState title="Selecciona una empresa" message="Las asignaciones pertenecen a la empresa activa." />
  return <section className="page-stack sprint4-page">
    <PageHeader eyebrow="Capacitación" title="Asignación y seguimiento" description="Inscribe colaboradores y consulta su avance y resultado." />
    {error && <Alert tone="error">{error} <Button size="sm" variant="secondary" onClick={() => void loadEnrollments()}>Reintentar</Button></Alert>}
    {notice && <Alert tone="success">{notice}</Alert>}
    <Panel title="Curso" actions={<Link to="/capacitacion/cursos">Ver catálogo →</Link>}>
      {courses.length === 0 && !loading ? <EmptyState title="Aún no hay cursos publicados" message="Crea un curso con lecciones y publícalo antes de asignarlo." /> : <Field label="Curso publicado"><select value={courseId} onChange={e => { setCourseId(e.target.value); setNotice(null) }}>{courses.map(item => <option key={item.id} value={item.id}>{item.titulo}</option>)}</select></Field>}
      {selectedCourse && <p className="text-muted">{selectedCourse.categoria || 'Sin categoría'} · Nota mínima: {selectedCourse.nota_minima}% · {selectedCourse.es_obligatorio ? 'Obligatorio' : 'Opcional'}</p>}
    </Panel>
    {courseId && <Panel title="Asignar curso" eyebrow="Inscripción">
      <div className="sprint4-choice" role="group" aria-label="Tipo de asignación"><label><input type="radio" name="target" checked={targetType === 'empleado'} onChange={() => setTargetType('empleado')} />Empleado</label><label><input type="radio" name="target" checked={targetType === 'departamento'} onChange={() => setTargetType('departamento')} />Departamento</label></div>
      <div className="form-grid">{targetType === 'empleado' ? <EmpleadoPicker value={employeeId} onChange={setEmployeeId} empresaId={selectedCompanyId} /> : <Field label="Departamento"><select value={departmentId} onChange={e => setDepartmentId(e.target.value)}><option value="">Seleccionar departamento</option>{departments.map(item => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></Field>}<Field label="Fecha límite (opcional)"><input type="date" min={new Date().toISOString().slice(0, 10)} value={deadline} onChange={e => setDeadline(e.target.value)} /></Field></div>
      {targetType === 'departamento' && <p className="text-muted">Se inscribirán los empleados activos con contrato vigente en el departamento. Los ya inscritos no se duplican.</p>}
      <div className="form-actions"><Button loading={busy} disabled={loading} onClick={() => void assign()}>Asignar curso</Button></div>
    </Panel>}
    {courseId && <Panel title="Seguimiento" count={`${enrollments.length} inscripciones`} actions={<Button size="sm" variant="secondary" disabled={loading} onClick={() => void loadEnrollments()}>Actualizar</Button>}>
      {loading ? <p role="status">Cargando seguimiento…</p> : enrollments.length === 0 ? <EmptyState title="Sin inscripciones" message="Asigna este curso para comenzar a ver el avance." /> : <div className="table-wrap"><table><thead><tr><th>Empleado</th><th>Avance</th><th>Calificación</th><th>Estado</th><th>Fecha límite</th><th>Acción</th></tr></thead><tbody>{enrollments.map(item => { const employee = employeesById.get(item.empleado_id); return <tr key={item.id}><td>{employee ? `${employee.codigo} — ${nombreCompleto(employee)}` : `Empleado · ${item.empleado_id.slice(0, 8)}`}</td><td><div className="sprint4-progress"><span style={{ width: `${Math.min(100, Math.max(0, item.progreso))}%` }} /></div><small>{item.progreso}%</small></td><td>{item.calificacion == null ? 'Pendiente' : `${item.calificacion}%`}</td><td><span className="sprint4-state">{item.estado}</span>{item.aprobado && <small> · Aprobado</small>}</td><td>{item.fecha_limite || 'Sin límite'}</td><td><div className="sprint4-grade"><input type="number" min="0" max="100" aria-label={`Calificación de ${employee ? nombreCompleto(employee) : item.empleado_id}`} placeholder="0–100" value={gradeValues[item.id] ?? ''} onChange={e => setGradeValues(current => ({ ...current, [item.id]: e.target.value }))} /><Button size="sm" variant="secondary" disabled={busy || (item.progreso < 100)} onClick={() => void grade(item.id)}>Calificar</Button>{item.aprobado && <Button size="sm" variant="quiet" onClick={() => void downloadFile(`/api/v1/capacitacion/inscripciones/${encodeURIComponent(item.id)}/certificado?empresa_id=${encodeURIComponent(selectedCompanyId ?? '')}`, `certificado-${item.id}.pdf`).catch(cause => setError(errorText(cause)))}>Certificado</Button>}</div></td></tr> })}</tbody></table></div>}
      {enrollments.length > 0 && <p className="text-muted">La calificación se habilita al completar todas las lecciones. La aprobación depende de la nota mínima del curso.</p>}
    </Panel>}
  </section>
}
