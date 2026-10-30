import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CalendarPlus, Check, Pencil, ClipboardCheck, X } from 'lucide-react'
import { useAccess } from '../../../app/access/AccessProvider'
import { useCompanyScope } from '../../../app/context/CompanyScopeContext'
import { Alert, Button, ConfirmDialog, DataTable, EstadoBadge, Field, Modal, PageHeader, Pagination } from '../../../shared/components'
import { EntrevistaForm } from '../components/EntrevistaForm'
import { ResultadoForm } from '../components/ResultadoForm'
import { cambiarEstadoEntrevista, getEntrevistas, getOpcionesEntrevistas, type Entrevista, type Entrevistador, type PostulacionOpcion } from '../api/entrevistasApi'

export function EntrevistasPage() {
  const { selectedCompanyId } = useCompanyScope()
  const [params] = useSearchParams()
  return <Agenda key={`${selectedCompanyId}:${params.get('postulacion') ?? ''}`} empresaId={selectedCompanyId ?? undefined} postulacionId={params.get('postulacion') ?? undefined} />
}
function Agenda({ empresaId, postulacionId }: { empresaId?: string; postulacionId?: string }) {
  const { can } = useAccess()
  const gestionar = can('entrevistas:gestionar', 'platform:entrevistas:gestionar')
  const resultado = can('entrevistas:registrar_resultado', 'platform:entrevistas:registrar_resultado')
  const [items, setItems] = useState<Entrevista[]>([])
  const [users, setUsers] = useState<Entrevistador[]>([])
  const [posts, setPosts] = useState<PostulacionOpcion[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [estado, setEstado] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [reload, setReload] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [optionsError, setOptionsError] = useState('')
  const [editing, setEditing] = useState<Entrevista | null | undefined>(undefined)
  const [result, setResult] = useState<Entrevista | null>(null)
  const [transition, setTransition] = useState<{ item: Entrevista; estado: 'CONFIRMADA' | 'CANCELADA' } | null>(null)
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState('')
  useEffect(() => {
    let active = true
    setLoading(true); setError('')
    getEntrevistas({ page, per_page: 10, estado, postulacion_id: postulacionId, fecha_desde: desde ? new Date(`${desde}T00:00`).toISOString() : undefined, fecha_hasta: hasta ? new Date(`${hasta}T23:59:59`).toISOString() : undefined }, empresaId)
      .then(data => { if (active) { setItems(data.items); setTotal(data.total) } })
      .catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'No se pudo cargar la agenda.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [empresaId, page, estado, desde, hasta, postulacionId, reload])
  useEffect(() => {
    let active = true
    getOpcionesEntrevistas(empresaId).then(data => { if (active) { setUsers(data.entrevistadores); setPosts(data.postulaciones); setOptionsError('') } }).catch(cause => { if (active) setOptionsError(cause instanceof Error ? cause.message : 'No se pudieron cargar las opciones.') })
    return () => { active = false }
  }, [empresaId, gestionar, reload])
  async function saved() { setEditing(undefined); setResult(null); setReload(n => n + 1) }
  async function change() {
    if (!transition || saving) return
    setSaving(true); setActionError('')
    try { await cambiarEstadoEntrevista(transition.item.id, transition.estado, empresaId); setTransition(null); await saved() }
    catch (cause) { setActionError(cause instanceof Error ? cause.message : 'No se pudo cambiar el estado.') }
    finally { setSaving(false) }
  }
  return <section className="page-stack">
    <PageHeader title="Agenda de entrevistas" eyebrow="Reclutamiento" actions={gestionar && <Button onClick={() => setEditing(null)} disabled={!!optionsError}><CalendarPlus size={16} /> Programar</Button>} />
    {optionsError && <Alert tone="error">{optionsError}<Button variant="ghost" onClick={() => setReload(n => n + 1)}>Reintentar opciones</Button></Alert>}
    <div className="toolbar" role="group" aria-label="Filtros de entrevistas">
      <Field label="Estado"><select value={estado} onChange={e => { setEstado(e.target.value); setPage(1) }}><option value="">Todos</option>{['PROGRAMADA', 'CONFIRMADA', 'REALIZADA', 'CANCELADA'].map(s => <option key={s}>{s}</option>)}</select></Field>
      <Field label="Desde"><input type="date" value={desde} onChange={e => { setDesde(e.target.value); setPage(1) }} /></Field>
      <Field label="Hasta"><input type="date" min={desde} value={hasta} onChange={e => { setHasta(e.target.value); setPage(1) }} /></Field>
    </div>
    <DataTable rows={items} rowKey={e => e.id} loading={loading} error={error || null} onRetry={() => setReload(n => n + 1)} caption="Entrevistas" columns={[
      { key: 'candidato', header: 'Candidato', render: e => <Link to={`/seleccion?postulacion=${e.postulacion_id}`}>{e.nombre_postulante ?? posts.find(p => p.id === e.postulacion_id)?.nombre_postulante ?? e.postulacion_id}</Link> },
      { key: 'responsable', header: 'Entrevistador', render: e => e.entrevistador_nombre ?? users.find(u => u.id === e.entrevistador_id)?.nombre ?? e.entrevistador_id },
      { key: 'fecha', header: 'Fecha / duración', render: e => <>{new Date(e.fecha_hora).toLocaleString('es-BO')} · {e.duracion_min} min</> },
      { key: 'tipo', header: 'Tipo / modalidad', render: e => `${e.tipo} · ${e.modalidad}` },
      { key: 'estado', header: 'Estado', render: e => <EstadoBadge estado={e.estado} /> },
      { key: 'puntaje', header: 'Resultado', render: e => e.puntaje == null ? 'Sin resultado' : `${e.puntaje}/100 · ${e.recomendacion ?? ''}` },
      { key: 'acciones', header: 'Acciones', render: e => <div className="filters-actions">
        {gestionar && ['PROGRAMADA', 'CONFIRMADA'].includes(e.estado) && <><Button variant="ghost" size="sm" title="Reprogramar" aria-label="Reprogramar" onClick={() => setEditing(e)}><Pencil size={16} /></Button>{e.estado === 'PROGRAMADA' && <Button variant="ghost" size="sm" title="Confirmar" aria-label="Confirmar" onClick={() => { setActionError(''); setTransition({ item: e, estado: 'CONFIRMADA' }) }}><Check size={16} /></Button>}<Button variant="danger-outline" size="sm" title="Cancelar entrevista" aria-label="Cancelar entrevista" onClick={() => { setActionError(''); setTransition({ item: e, estado: 'CANCELADA' }) }}><X size={16} /></Button></>}
        {resultado && e.estado !== 'CANCELADA' && <Button variant="ghost" size="sm" title="Registrar resultado" aria-label="Registrar resultado" onClick={() => setResult(e)}><ClipboardCheck size={16} /></Button>}
      </div> },
    ]} />
    {!error && <Pagination page={page} perPage={10} total={total} onPageChange={setPage} />}
    {editing !== undefined && gestionar && <Modal title={editing ? 'Reprogramar entrevista' : 'Programar entrevista'} onClose={() => setEditing(undefined)} size="lg"><EntrevistaForm entrevista={editing} postulacionId={postulacionId} entrevistadores={users} postulaciones={posts} empresaId={empresaId} onSaved={saved} onCancel={() => setEditing(undefined)} /></Modal>}
    {result && resultado && <Modal title="Resultado de entrevista" onClose={() => setResult(null)}><ResultadoForm entrevista={result} empresaId={empresaId} onSaved={saved} /></Modal>}
    {transition && <ConfirmDialog title={transition.estado === 'CANCELADA' ? 'Cancelar entrevista' : 'Confirmar entrevista'} message={new Date(transition.item.fecha_hora).toLocaleString('es-BO')} loading={saving} error={actionError} onCancel={() => { if (!saving) setTransition(null) }} onConfirm={() => void change()} />}
  </section>
}
