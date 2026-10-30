import { useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Columns2, Eye } from 'lucide-react'
import { useAccess } from '../../../app/access/AccessProvider'
import { useCompanyScope } from '../../../app/context/CompanyScopeContext'
import { Alert, Button, DataTable, EmptyState, Field, Modal, PageHeader, Pagination } from '../../../shared/components'
import { getEtapas, getPostulaciones, type Etapa, type PostulanteDetalle } from '../../tablero/api/tableroApi'
import { PostulanteDetalleModal } from '../../tablero/components/PostulanteDetalleModal'
import { compararCandidatos, getAnalisis, getRanking, getVacantesSeleccion, type AnalisisCV, type RankingCandidato, type VacanteSeleccion } from '../api/seleccionApi'
import '../seleccion.css'

export function SeleccionPage() {
  const { selectedCompanyId } = useCompanyScope()
  const { id } = useParams()
  const [params] = useSearchParams()
  const vacanteId = id ?? params.get('vacante') ?? undefined
  return <Seleccion key={`${selectedCompanyId}:${vacanteId ?? ''}`} empresaId={selectedCompanyId ?? undefined} vacanteInicial={vacanteId} />
}
function score(value: number | null | undefined) { return value == null ? 'Sin información' : `${value}/100` }
function list(value?: string[]) { return value?.join(', ') || 'Sin información' }
function Seleccion({ empresaId, vacanteInicial }: { empresaId?: string; vacanteInicial?: string }) {
  const { can } = useAccess()
  const [params] = useSearchParams()
  const [vacantes, setVacantes] = useState<VacanteSeleccion[]>([])
  const [vacanteId, setVacanteId] = useState(vacanteInicial ?? '')
  const [items, setItems] = useState<RankingCandidato[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [busqueda, setBusqueda] = useState('')
  const [estado, setEstado] = useState('')
  const [orden, setOrden] = useState('ia')
  const [requiredSkills, setRequiredSkills] = useState<string[]>([])
  const [comparisonAnalysis, setComparisonAnalysis] = useState<Record<string, AnalisisCV | undefined>>({})
  const [selected, setSelected] = useState<string[]>([])
  const [comparison, setComparison] = useState<RankingCandidato[] | null>(null)
  const [detail, setDetail] = useState<PostulanteDetalle | null>(null)
  const [etapas, setEtapas] = useState<Etapa[]>([])
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [catalogError, setCatalogError] = useState('')
  const [reload, setReload] = useState(0)
  const contextVersion = useRef(0)
  useEffect(() => {
    let active = true
    setCatalogError('')
    getVacantesSeleccion(empresaId).then(data => { if (active) setVacantes(data) }).catch(cause => { if (active) setCatalogError(cause instanceof Error ? cause.message : 'No se pudieron consultar las vacantes.') })
    return () => { active = false }
  }, [empresaId, reload])
  useEffect(() => {
    if (!vacanteId) return
    let active = true
    setLoading(true); setError('')
    getRanking(vacanteId, empresaId, { page, per_page: 10, busqueda, estado, orden }).then(data => { if (active) { setItems(data.items); setTotal(data.total) } }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'No se pudo cargar el ranking.') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [empresaId, vacanteId, page, busqueda, estado, orden, reload])
  useEffect(() => {
    const id = params.get('postulacion')
    if (!id) return
    let active = true
    setBusy(true)
    getPostulaciones(undefined, empresaId).then(data => {
      if (!active) return
      const candidate = data.find(p => p.id === id)
      if (candidate) { setDetail(candidate); setVacanteId(candidate.vacante_id) }
      else setActionError('La postulación no está disponible en esta empresa.')
    }).catch(cause => { if (active) setActionError(cause instanceof Error ? cause.message : 'No se pudo abrir la postulación.') }).finally(() => { if (active) setBusy(false) })
    return () => { active = false }
  }, [empresaId, params])
  async function open(id: string) {
    if (busy) return
    const version = contextVersion.current
    setBusy(true); setActionError('')
    try { const data = await getPostulaciones(vacanteId, empresaId); if (version !== contextVersion.current) return; const candidate = data.find(p => p.id === id); if (!candidate) throw new Error('La postulación no está disponible.'); setDetail({ ...candidate, vacante_titulo: vacantes.find(v => v.id === vacanteId)?.titulo ?? '' }) }
    catch (cause) { if (version === contextVersion.current) setActionError(cause instanceof Error ? cause.message : 'No se pudo abrir el candidato.') }
    finally { if (version === contextVersion.current) setBusy(false) }
  }
  useEffect(() => {
    if (!detail) return
    let active = true
    getEtapas(empresaId).then(data => { if (active) setEtapas(data) }).catch(cause => { if (active) setActionError(cause instanceof Error ? cause.message : 'No se pudieron cargar las etapas.') })
    return () => { active = false }
  }, [empresaId, detail])
  async function compare() {
    if (busy) return
    const version = contextVersion.current
    setBusy(true); setActionError('')
    try {
      const candidates = await compararCandidatos(vacanteId, selected, empresaId)
      if (version !== contextVersion.current) return
      const analyses = await Promise.all(candidates.map(async c => [c.id, (await getAnalisis(c.id, empresaId))[0]] as const))
      if (version !== contextVersion.current) return
      setRequiredSkills(vacantes.find(v => v.id === vacanteId)?.habilidades ?? [])
      setComparisonAnalysis(Object.fromEntries(analyses)); setComparison(candidates)
    }
    catch (cause) { if (version === contextVersion.current) setActionError(cause instanceof Error ? cause.message : 'No se pudo comparar.') }
    finally { if (version === contextVersion.current) setBusy(false) }
  }
  return <section className="page-stack">
    <PageHeader title="Selección de candidatos" eyebrow="Reclutamiento" actions={<><Link className="button button-ghost" to={vacanteId ? `/vacantes/${vacanteId}/tablero` : '/vacantes'}><ArrowLeft size={16} /> Tablero</Link><Button loading={busy} disabled={selected.length < 2 || selected.length > 4} onClick={() => void compare()}><Columns2 size={16} /> Comparar ({selected.length}/4)</Button></>} />
    {catalogError && <Alert tone="error">{catalogError}<Button variant="ghost" onClick={() => setReload(n => n + 1)}>Reintentar</Button></Alert>}
    {actionError && <Alert tone="error">{actionError}</Alert>}
    <div className="toolbar" role="group" aria-label="Filtros de selección">
      <Field label="Vacante"><select value={vacanteId} onChange={e => { contextVersion.current += 1; setBusy(false); setActionError(''); setVacanteId(e.target.value); setPage(1); setSelected([]); setComparison(null); setDetail(null); setItems([]); setTotal(0) }}><option value="">Seleccionar vacante</option>{vacantes.map(v => <option key={v.id} value={v.id}>{v.titulo}</option>)}</select></Field>
      <Field label="Buscar candidato"><input type="search" value={busqueda} onChange={e => { setBusqueda(e.target.value); setPage(1) }} /></Field>
      <Field label="Estado"><select value={estado} onChange={e => { setEstado(e.target.value); setPage(1) }}><option value="">Todos</option>{['ACTIVA', 'DESCARTADA', 'CONTRATADA', 'RETIRADA'].map(s => <option key={s}>{s}</option>)}</select></Field>
      <Field label="Orden"><select value={orden} onChange={e => { setOrden(e.target.value); setPage(1) }}><option value="ia">Afinidad de CV</option><option value="manual">Puntaje manual</option>{can('entrevistas:ver', 'platform:entrevistas:ver') && <option value="entrevistas">Entrevistas</option>}{can('evaluaciones:ver', 'platform:evaluaciones:ver') && <option value="evaluaciones">Evaluaciones</option>}</select></Field>
    </div>
    {!vacanteId ? <EmptyState title="Selecciona una vacante" message="" /> : <>
      <DataTable rows={items} rowKey={c => c.id} loading={loading} error={error || null} onRetry={() => setReload(n => n + 1)} columns={[
        { key: 'select', header: '', render: c => <input type="checkbox" aria-label={`Comparar a ${c.nombre_postulante}`} checked={selected.includes(c.id)} disabled={!selected.includes(c.id) && selected.length >= 4} onChange={e => setSelected(v => e.target.checked ? [...v, c.id] : v.filter(id => id !== c.id))} /> },
        { key: 'nombre', header: 'Candidato', render: c => <strong>{c.nombre_postulante}</strong> },
        { key: 'estado', header: 'Estado', render: c => c.estado },
        { key: 'ia', header: 'Afinidad CV', render: c => c.puntaje_ia == null ? 'Pendiente de análisis' : score(c.puntaje_ia) },
        { key: 'manual', header: 'Manual', render: c => score(c.puntaje_manual) },
        ...(can('entrevistas:ver', 'platform:entrevistas:ver') ? [{ key: 'entrevistas', header: 'Entrevistas', render: (c: RankingCandidato) => score(c.puntaje_entrevistas) }] : []),
        ...(can('evaluaciones:ver', 'platform:evaluaciones:ver') ? [{ key: 'evaluaciones', header: 'Evaluaciones', render: (c: RankingCandidato) => score(c.puntaje_evaluaciones) }] : []),
        { key: 'acciones', header: 'Detalle', render: c => <Button variant="ghost" title="Ver candidato" aria-label={`Ver ${c.nombre_postulante}`} disabled={busy} onClick={() => void open(c.id)}><Eye size={16} /></Button> },
      ]} />
      {!error && <Pagination page={page} perPage={10} total={total} onPageChange={setPage} />}
    </>}
    {comparison && <Modal title="Comparación de finalistas" size="lg" onClose={() => setComparison(null)}><div className="table-wrap"><table className="selection-comparison"><thead><tr><th>Criterio</th>{comparison.map(c => <th key={c.id}>{c.nombre_postulante}<Button size="sm" variant="ghost" onClick={() => { setComparison(null); void open(c.id) }}>Ver detalle</Button></th>)}</tr></thead><tbody>{[
      ['Afinidad CV', (c: RankingCandidato) => score(c.puntaje_ia)], ['Manual', (c: RankingCandidato) => score(c.puntaje_manual)], ['Experiencia (años)', (c: RankingCandidato) => c.experiencia_anios ?? 'Sin información'], ['Educación', (c: RankingCandidato) => c.educacion || 'Sin información'], ['Habilidades requeridas', () => list(requiredSkills)], ['Habilidades detectadas', (c: RankingCandidato) => list(c.habilidades_detectadas)], ['Habilidades faltantes', (c: RankingCandidato) => list(c.habilidades_faltantes)], ['Resumen', (c: RankingCandidato) => comparisonAnalysis[c.id]?.resumen_ia ?? 'Sin información'],
      ...(can('entrevistas:ver', 'platform:entrevistas:ver') ? [['Puntaje entrevistas', (c: RankingCandidato) => score(c.puntaje_entrevistas)]] : []),
      ...(can('evaluaciones:ver', 'platform:evaluaciones:ver') ? [['Puntaje evaluaciones', (c: RankingCandidato) => score(c.puntaje_evaluaciones)]] : []),
      ...(can('entrevistas:ver', 'platform:entrevistas:ver') ? [['Resultados de entrevistas', (c: RankingCandidato) => c.entrevistas?.map(e => `${e.tipo}: ${score(e.puntaje)} · ${e.recomendacion ?? ''} · ${e.observaciones ?? ''}`).join('; ') || 'Sin información']] : []),
      ...(can('evaluaciones:ver', 'platform:evaluaciones:ver') ? [['Evaluaciones registradas', (c: RankingCandidato) => c.evaluaciones?.map(e => `${e.nombre}: ${e.puntaje}/${e.puntaje_maximo} · ${e.aprobado == null ? 'Sin dictamen' : e.aprobado ? 'Aprobado' : 'No aprobado'}`).join('; ') || 'Sin información']] : []),
    ].map(([label, render]) => <tr key={String(label)}><th>{String(label)}</th>{comparison.map(c => <td key={c.id}>{(render as (candidate: RankingCandidato) => string | number)(c)}</td>)}</tr>)}</tbody></table></div></Modal>}
    {detail && <PostulanteDetalleModal key={detail.id} postulante={detail} etapas={etapas} empresaId={empresaId} onClose={() => setDetail(null)} onSelectionChanged={() => setReload(n => n + 1)} onUpdated={async () => { setDetail(null); setReload(n => n + 1) }} />}
  </section>
}
