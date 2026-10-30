import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Plus, UserPlus, BookmarkPlus, BookmarkMinus } from 'lucide-react'
import { useCompanyScope } from '../../../app/context/CompanyScopeContext'
import { useAccess } from '../../../app/access/AccessProvider'
import { ApiError } from '../../../shared/api/httpClient'
import { Alert, Button, ConfirmDialog, DataTable, Field, Modal, PageHeader } from '../../../shared/components'
import { getVacantes, type VacanteListItem } from '../../vacantes/api/vacantesApi'
import { listarHabilidades, type Habilidad } from '../../habilidades/api/habilidadesApi'
import { actualizarBancoTalento, asociarVacante, crearPostulante, listarPostulantes, type Postulante, type PostulanteRequest } from '../api/postulantesApi'

export function PostulantesPage() {
  const { selectedCompanyId } = useCompanyScope()
  return <Banco key={selectedCompanyId} empresaId={selectedCompanyId ?? undefined} />
}
function Banco({ empresaId }: { empresaId?: string }) {
  const { can } = useAccess()
  const gestionar = can('postulantes:gestionar', 'platform:postulantes:gestionar')
  const [items, setItems] = useState<Postulante[]>([])
  const [vacantes, setVacantes] = useState<VacanteListItem[]>([])
  const [habilidades, setHabilidades] = useState<Habilidad[]>([])
  const [q, setQ] = useState('')
  const [banco, setBanco] = useState('true')
  const [experiencia, setExperiencia] = useState('')
  const [habilidad, setHabilidad] = useState('')
  const [page, setPage] = useState(1)
  const [reload, setReload] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [form, setForm] = useState(false)
  const [toggle, setToggle] = useState<Postulante | null>(null)
  const [associate, setAssociate] = useState<Postulante | null>(null)
  const [vacanteId, setVacanteId] = useState('')
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  const [createdPost, setCreatedPost] = useState<{ id: string; vacante_id: string } | null>(null)
  useEffect(() => {
    let active = true
    setLoading(true); setError('')
    listarPostulantes(empresaId, { q, en_banco_talento: banco === '' ? undefined : banco === 'true', experiencia_min: experiencia === '' ? undefined : Number(experiencia), habilidad_id: habilidad, offset: (page - 1) * 10, limit: 11 }).then(data => { if (active) setItems(data) }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'No se pudo cargar el banco de talento.') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [empresaId, q, banco, experiencia, habilidad, page, reload])
  useEffect(() => {
    if (!empresaId || !can('habilidades:ver', 'platform:habilidades:gestionar')) return
    let active = true
    listarHabilidades(empresaId).then(data => { if (active) setHabilidades(data) }).catch(cause => { if (active) setActionError(cause instanceof Error ? cause.message : 'No se pudieron cargar las habilidades.') })
    return () => { active = false }
  }, [empresaId, can])
  useEffect(() => {
    if (!associate) return
    let active = true
    getVacantes({ empresa_id: empresaId, estado: 'PUBLICADA', per_page: 100000 }).then(data => { if (active) setVacantes(data.items) }).catch(cause => { if (active) setActionError(cause instanceof Error ? cause.message : 'No se pudieron cargar las vacantes.') })
    return () => { active = false }
  }, [empresaId, associate])
  async function changeBank() {
    if (!toggle || busy) return
    setBusy(true); setActionError('')
    try { await actualizarBancoTalento(toggle.id, !toggle.en_banco_talento, empresaId); setToggle(null); setReload(n => n + 1); setMessage('Banco de talento actualizado.') }
    catch (cause) { setActionError(cause instanceof Error ? cause.message : 'No se pudo actualizar.') }
    finally { setBusy(false) }
  }
  async function linkVacancy(event: FormEvent) {
    event.preventDefault()
    if (!associate || !vacanteId || busy) return
    setBusy(true); setActionError('')
    try { setCreatedPost(await asociarVacante(associate.id, vacanteId, empresaId)); setReload(n => n + 1) }
    catch (cause) { setActionError(cause instanceof Error ? cause.message : 'No se pudo asociar la vacante.') }
    finally { setBusy(false) }
  }
  return <section className="page-stack">
    <PageHeader title="Banco de talento" eyebrow="Reclutamiento" actions={gestionar && <Button onClick={() => setForm(true)}><Plus size={16} /> Alta manual</Button>} />
    {message && <Alert tone="success">{message}</Alert>}
    {actionError && !associate && !toggle && <Alert tone="error">{actionError}</Alert>}
    <div className="toolbar" role="group" aria-label="Filtros del banco de talento">
      <Field label="Buscar"><input type="search" value={q} maxLength={120} onChange={e => { setQ(e.target.value); setPage(1) }} /></Field>
      <Field label="Banco de talento"><select value={banco} onChange={e => { setBanco(e.target.value); setPage(1) }}><option value="true">Incluidos</option><option value="false">No incluidos</option><option value="">Todos</option></select></Field>
      <Field label="Experiencia mínima (años)"><input type="number" min={0} step={1} value={experiencia} onChange={e => { setExperiencia(e.target.value); setPage(1) }} /></Field>
      {habilidades.length > 0 && <Field label="Habilidad"><select value={habilidad} onChange={e => { setHabilidad(e.target.value); setPage(1) }}><option value="">Todas</option>{habilidades.map(h => <option key={h.id} value={h.id}>{h.nombre}</option>)}</select></Field>}
    </div>
    <DataTable rows={items.slice(0, 10)} rowKey={p => p.id} loading={loading} error={error || null} onRetry={() => setReload(n => n + 1)} columns={[
      { key: 'nombre', header: 'Nombre', render: p => <strong>{p.nombres} {p.apellidos}</strong> },
      { key: 'contacto', header: 'Contacto', render: p => <>{p.email}<br />{p.telefono}</> },
      { key: 'ciudad', header: 'Ciudad', render: p => p.ciudad },
      { key: 'experiencia', header: 'Experiencia', render: p => `${p.anios_experiencia} años · ${p.nivel_educativo}` },
      { key: 'banco', header: 'Banco', render: p => p.en_banco_talento ? 'Incluido' : 'No incluido' },
      { key: 'acciones', header: 'Acciones', render: p => gestionar && <div className="filters-actions"><Button variant="ghost" title={p.en_banco_talento ? 'Excluir del banco' : 'Incluir en banco'} aria-label={p.en_banco_talento ? 'Excluir del banco' : 'Incluir en banco'} onClick={() => { setActionError(''); setToggle(p) }}>{p.en_banco_talento ? <BookmarkMinus size={16} /> : <BookmarkPlus size={16} />}</Button>{p.en_banco_talento && <Button variant="ghost" title="Asociar a vacante" aria-label="Asociar a vacante" onClick={() => { setAssociate(p); setVacanteId(''); setCreatedPost(null); setActionError('') }}><UserPlus size={16} /></Button>}</div> },
    ]} />
    {!error && <nav className="pagination" aria-label="Paginación de talento"><span>Página {page}</span><div className="pagination-controls"><Button variant="ghost" disabled={page === 1 || loading} onClick={() => setPage(p => p - 1)}>Anterior</Button><Button variant="ghost" disabled={items.length <= 10 || loading} onClick={() => setPage(p => p + 1)}>Siguiente</Button></div></nav>}
    {toggle && <ConfirmDialog title={toggle.en_banco_talento ? 'Excluir del banco de talento' : 'Incluir en banco de talento'} message={`${toggle.nombres} ${toggle.apellidos}`} loading={busy} error={actionError} onCancel={() => { if (!busy) setToggle(null) }} onConfirm={() => void changeBank()} />}
    {associate && <Modal title={`Asociar a vacante: ${associate.nombres}`} onClose={() => { if (!busy) setAssociate(null) }}>{actionError && <Alert tone="error">{actionError}</Alert>}{createdPost ? <Alert tone="success" title="Postulación creada"><Link to={`/vacantes/${createdPost.vacante_id}/seleccion?postulacion=${createdPost.id}`}>Ver postulación</Link></Alert> : <form className="form-stack" onSubmit={linkVacancy}><Field label="Vacante"><select required value={vacanteId} onChange={e => setVacanteId(e.target.value)}><option value="">Seleccionar</option>{vacantes.map(v => <option key={v.id} value={v.id}>{v.titulo}</option>)}</select></Field><Button type="submit" loading={busy} disabled={!vacanteId}><UserPlus size={16} /> Asociar candidato</Button></form>}</Modal>}
    {form && <Modal title="Alta manual de postulante" size="lg" onClose={() => setForm(false)}><AltaForm empresaId={empresaId} onSaved={() => { setForm(false); setMessage('Postulante registrado.'); setReload(n => n + 1) }} /></Modal>}
  </section>
}
function AltaForm({ empresaId, onSaved }: { empresaId?: string; onSaved: () => void }) {
  const [error, setError] = useState('')
  const [fields, setFields] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const form = new FormData(event.currentTarget)
    setBusy(true); setError(''); setFields({})
    try { await crearPostulante({ nombres: String(form.get('nombres')).trim(), apellidos: String(form.get('apellidos')).trim(), ci: String(form.get('ci')).trim(), email: String(form.get('email')).trim(), telefono: String(form.get('telefono')).trim(), ciudad: String(form.get('ciudad')).trim(), nivel_educativo: String(form.get('nivel_educativo')) as PostulanteRequest['nivel_educativo'], anios_experiencia: Number(form.get('anios_experiencia')), linkedin: String(form.get('linkedin') || '') || null, cv_url: null, fuente: 'OTRO' }, empresaId); onSaved() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo registrar.'); if (cause instanceof ApiError) setFields(cause.fieldErrors) }
    finally { setBusy(false) }
  }
  return <form className="form-stack" onSubmit={submit}>{error && <Alert tone="error">{error}</Alert>}<div className="form-grid">{[['nombres', 'Nombres'], ['apellidos', 'Apellidos'], ['ci', 'CI'], ['email', 'Correo'], ['telefono', 'Teléfono'], ['ciudad', 'Ciudad']].map(([name, label]) => <Field key={name} label={label} error={fields[name]}><input name={name} required type={name === 'email' ? 'email' : 'text'} /></Field>)}<Field label="Nivel educativo" error={fields.nivel_educativo}><select name="nivel_educativo">{['SECUNDARIA', 'TECNICO', 'LICENCIATURA', 'MAESTRIA', 'DOCTORADO'].map(n => <option key={n}>{n}</option>)}</select></Field><Field label="Experiencia (años)" error={fields.anios_experiencia}><input name="anios_experiencia" type="number" min={0} step={1} defaultValue={0} required /></Field><Field label="LinkedIn" error={fields.linkedin}><input name="linkedin" type="url" /></Field></div><div className="form-actions"><Button type="submit" loading={busy}>Registrar postulante</Button></div></form>
}
