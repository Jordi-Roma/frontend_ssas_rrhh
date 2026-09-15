import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, Filter } from 'lucide-react'
import type { components } from '../../../shared/api/schema'
import { bitacoraApi, type AuditFilters } from '../api/bitacoraApi'
import { useCompanyScope } from '../../../app/context/CompanyScopeContext.tsx'
import { Button, EmptyState, PageHeader, Panel } from '../../../shared/components'

type AuditLog = components['schemas']['AuditLogSchema']
const formatter = new Intl.DateTimeFormat('es-BO', { dateStyle: 'medium', timeStyle: 'short' })

export function BitacoraPage() {
  const { company } = useCompanyScope()
  const [entries, setEntries] = useState<AuditLog[]>([])
  const [filters, setFilters] = useState<AuditFilters>({ page: 1, per_page: 50 })
  const [draft, setDraft] = useState({ module: '', action: '', start_date: '', end_date: '' })
  const [expanded, setExpanded] = useState<string | null>(null)
  const [detail, setDetail] = useState<AuditLog | null>(null)
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [total, setTotal] = useState(0)

  useEffect(() => {
    let active = true
    setStatus('loading')
    bitacoraApi.list({ ...filters, empresa_id: company?.id }).then((data) => {
      if (active) {
        setEntries(data.items ?? [])
        setTotal(data.total)
        setStatus('success')
      }
    }).catch(() => active && setStatus('error'))
    return () => { active = false }
  }, [company?.id, filters])

  function search() {
    setFilters({
      module: draft.module || undefined,
      action: draft.action || undefined,
      start_date: draft.start_date ? new Date(`${draft.start_date}T00:00:00`).toISOString() : undefined,
      end_date: draft.end_date ? new Date(`${draft.end_date}T23:59:59`).toISOString() : undefined,
      page: 1,
      per_page: 50,
    })
  }

  async function toggleDetail(entry: AuditLog) {
    if (expanded === entry.id) {
      setExpanded(null); setDetail(null); return
    }
    setExpanded(entry.id); setDetail(null)
    try { setDetail(await bitacoraApi.get(entry.id, company?.id)) }
    catch { setExpanded(null); setStatus('error') }
  }

  return (
    <section className="page-stack">
      <PageHeader eyebrow="Seguridad y administración" title="Bitácora" description="Eventos obtenidos directamente desde la API de auditoría." />
      <Panel title="Eventos" count={`${total} registros`}>
        <div className="audit-filters">
          <label>Módulo<input value={draft.module} onChange={(e) => setDraft({ ...draft, module: e.target.value })} /></label>
          <label>Acción<input value={draft.action} onChange={(e) => setDraft({ ...draft, action: e.target.value })} /></label>
          <label>Desde<input type="date" value={draft.start_date} onChange={(e) => setDraft({ ...draft, start_date: e.target.value })} /></label>
          <label>Hasta<input type="date" value={draft.end_date} onChange={(e) => setDraft({ ...draft, end_date: e.target.value })} /></label>
          <Button onClick={search}><Filter size={17} aria-hidden="true" />Filtrar</Button>
        </div>
        {status === 'loading' && <p>Cargando eventos…</p>}
        {status === 'error' && <p className="form-error">No se pudo consultar la bitácora.</p>}
        {status === 'success' && (
          <div className="table-wrap"><table className="audit-table"><thead><tr><th>Fecha</th><th>Actor</th><th>Módulo</th><th>Acción</th><th>Nivel</th><th>IP origen</th><th /></tr></thead><tbody>
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td>{formatter.format(new Date(entry.created_at))}</td><td>{entry.actor_label ?? entry.user_id ?? 'Sistema'}</td><td>{entry.module}</td><td>{entry.action}</td><td>{entry.level}</td><td><code>{entry.source_ip ?? 'No disponible'}</code></td>
                <td><Button variant="ghost" size="sm" onClick={() => void toggleDetail(entry)}>{expanded === entry.id ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}{expanded === entry.id ? 'Ocultar' : 'Detalle'}</Button></td>
                {expanded === entry.id && <td className="audit-detail" colSpan={7}><div><strong>Descripción</strong><p>{entry.description}</p></div><div><strong>Cambios</strong>{detail ? <pre>{JSON.stringify({ anteriores: detail.previous_data, nuevos: detail.new_data }, null, 2)}</pre> : <p>Cargando detalle…</p>}</div><small>IP: {entry.source_ip ?? 'No disponible'} · Registro: {entry.record_id ?? 'N/A'}</small></td>}
              </tr>
            ))}
          </tbody></table>{entries.length === 0 && <EmptyState title="Sin eventos" message="No existen eventos para los filtros seleccionados." />}</div>
        )}
      </Panel>
    </section>
  )
}
