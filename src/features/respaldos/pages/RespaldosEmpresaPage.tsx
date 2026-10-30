import { useCallback, useEffect, useState } from 'react'
import { DatabaseBackup, Download, RefreshCw } from 'lucide-react'
import { useCompanyScope } from '../../../app/context/CompanyScopeContext'
import { useAccess } from '../../../app/access/AccessProvider'
import { useAuth } from '../../auth/hooks/useAuth'
import { Alert, Badge, Button, ConfirmDialog, EmptyState, PageHeader, Panel } from '../../../shared/components'
import { respaldosEmpresaApi, type ConfigRespaldosEmpresa, type RespaldoEmpresa, type UltimosRespaldos } from '../api/respaldosEmpresaApi'

const dateFormatter = new Intl.DateTimeFormat('es-BO', { dateStyle: 'medium', timeStyle: 'short' })
const PAGE_SIZE = 25

function date(value: string | null | undefined): string {
  return value ? dateFormatter.format(new Date(value)) : 'Sin respaldo'
}

function size(value: number | null): string {
  if (value === null) return 'Pendiente'
  return value < 1024 ** 2 ? `${(value / 1024).toFixed(1)} KB` : `${(value / 1024 ** 2).toFixed(1)} MB`
}

function tone(value: string): 'neutral' | 'success' | 'warning' | 'danger' {
  if (value === 'COMPLETADO') return 'success'
  if (value === 'FALLIDO') return 'danger'
  if (value === 'PENDIENTE' || value === 'PROCESANDO') return 'warning'
  return 'neutral'
}

export function RespaldosEmpresaPage() {
  const { user } = useAuth()
  const { can } = useAccess()
  const { company, companies } = useCompanyScope()
  const platform = user?.realm === 'platform'
  const empresaId = platform ? company?.id : undefined
  const [items, setItems] = useState<RespaldoEmpresa[]>([])
  const [latest, setLatest] = useState<UltimosRespaldos | null>(null)
  const [config, setConfig] = useState<ConfigRespaldosEmpresa | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [paging, setPaging] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    try {
      const list = await respaldosEmpresaApi.list(empresaId)
      setItems(list)
      setHasMore(list.length === PAGE_SIZE)
      setLatest(!platform || empresaId ? await respaldosEmpresaApi.latest(empresaId) : null)
      setConfig(platform && empresaId ? await respaldosEmpresaApi.config(empresaId) : null)
    } catch (error) {
      setMessage({ tone: 'error', text: error instanceof Error ? error.message : 'No se pudieron cargar los respaldos.' })
    } finally {
      if (!quiet) setLoading(false)
    }
  }, [empresaId, platform])

  async function loadMore() {
    setPaging(true)
    try {
      const next = await respaldosEmpresaApi.list(empresaId, items.length)
      setItems((current) => [...current, ...next])
      setHasMore(next.length === PAGE_SIZE)
    } catch (error) {
      setMessage({ tone: 'error', text: error instanceof Error ? error.message : 'No se pudo cargar más historial.' })
    } finally { setPaging(false) }
  }

  useEffect(() => { void load() }, [load])
  useEffect(() => {
    if (!items.some((item) => ['PENDIENTE', 'PROCESANDO'].includes(item.estado))) return
    const timer = window.setInterval(() => void load(true), 5000)
    return () => window.clearInterval(timer)
  }, [items, load])

  async function create() {
    if (platform && !empresaId) return
    setBusy(true); setMessage(null)
    try {
      await respaldosEmpresaApi.create(empresaId)
      setMessage({ tone: 'success', text: 'La solicitud fue registrada. Consulta el estado en el historial.' })
      await load(true)
    } catch (error) {
      setMessage({ tone: 'error', text: error instanceof Error ? error.message : 'No se pudo solicitar el respaldo.' })
    } finally { setBusy(false); setConfirming(false) }
  }

  async function changeAuto(enabled: boolean) {
    if (!empresaId) return
    setBusy(true); setMessage(null)
    try {
      setConfig(await respaldosEmpresaApi.updateConfig(empresaId, enabled))
      setMessage({ tone: 'success', text: 'Programación actualizada.' })
    } catch (error) {
      setMessage({ tone: 'error', text: error instanceof Error ? error.message : 'No se pudo actualizar la programación.' })
    } finally { setBusy(false) }
  }

  return <section className="page-stack">
    <PageHeader
      eyebrow="Continuidad operativa"
      title="Respaldos por empresa"
      description={platform ? 'Supervisa las copias de cada empresa.' : 'Consulta y descarga las copias de tu empresa.'}
      actions={<Button variant="secondary" onClick={() => void load()} loading={loading}><RefreshCw size={17} aria-hidden="true" />Actualizar</Button>}
    />
    {message && <Alert tone={message.tone}>{message.text}</Alert>}
    {platform && !empresaId && <Alert tone="info">Selecciona una empresa arriba para ver su último respaldo o solicitar uno. El historial muestra todas.</Alert>}
    {platform && empresaId && config && <Panel title="Programación automática">
      {!config.servicio_habilitado && <Alert tone="info">Los respaldos por empresa todavía no están habilitados en Railway.</Alert>}
      <label><input type="checkbox" checked={config.auto_habilitado} disabled={busy || !can('platform:backup:configurar')} onChange={(event) => void changeAuto(event.target.checked)} /> Respaldo diario para esta empresa</label>
      <p className="field-hint">Las copias automáticas se conservan {config.retencion_dias} días. Las manuales no caducan automáticamente.</p>
    </Panel>}
    {(!platform || empresaId) && <Panel title="Último respaldo">
      <p>Exitoso: <strong>{date(latest?.ultimo_exitoso?.fecha_finalizacion)}</strong></p>
      {latest?.ultimo_intento && <p>Último intento: <Badge tone={tone(latest.ultimo_intento.estado)}>{latest.ultimo_intento.estado}</Badge> {date(latest.ultimo_intento.fecha_creacion)}</p>}
      {latest?.ultimo_intento?.estado === 'FALLIDO' && <Alert tone="error">La última copia falló. Puedes solicitar otra o consultar al administrador de plataforma.</Alert>}
      {can(platform ? 'platform:backup:crear' : 'backup:crear') && <Button onClick={() => setConfirming(true)} loading={busy} disabled={items.some((item) => item.empresa_id === (empresaId ?? user?.empresaId) && ['PENDIENTE', 'PROCESANDO'].includes(item.estado))}><DatabaseBackup size={17} aria-hidden="true" />Crear respaldo</Button>}
    </Panel>}
    <Panel title="Historial" count={`${items.length} respaldos`}>
      {loading && <p>Cargando respaldos…</p>}
      {!loading && items.length === 0 && <EmptyState title="Sin respaldos" message="Todavía no hay copias registradas." />}
      {!loading && items.length > 0 && <div className="table-wrap"><table><thead><tr>{platform && !empresaId && <th>Empresa</th>}<th>Fecha</th><th>Origen</th><th>Tamaño</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>
        {items.map((item) => <tr key={item.id}>
          {platform && !empresaId && <td>{companies.find((company) => company.id === item.empresa_id)?.nombre_comercial ?? item.empresa_id}</td>}
          <td>{date(item.fecha_creacion)}{item.mensaje_error && <small className="backup-error">No se pudo completar</small>}</td>
          <td>{item.origen === 'AUTO' ? 'Automático' : 'Manual'}</td>
          <td>{size(item.tamano_bytes)}</td>
          <td><Badge tone={tone(item.estado)}>{item.estado}</Badge></td>
          <td>{item.estado === 'COMPLETADO' && can(platform ? 'platform:backup:descargar' : 'backup:descargar') && <Button size="sm" variant="ghost" onClick={() => void respaldosEmpresaApi.download(item.id).catch((error: Error) => setMessage({ tone: 'error', text: error.message }))}><Download size={16} aria-hidden="true" />Descargar</Button>}</td>
        </tr>)}
      </tbody></table></div>}
      {!loading && hasMore && <Button variant="secondary" loading={paging} onClick={() => void loadMore()}>Cargar más</Button>}
    </Panel>
    {confirming && <ConfirmDialog
      title="Crear respaldo por empresa"
      message={<>Se creará una copia de <strong>{platform ? company?.nombre_comercial : 'tu empresa'}</strong>. El proceso puede tardar unos minutos.</>}
      confirmLabel="Solicitar respaldo"
      loading={busy}
      onCancel={() => setConfirming(false)}
      onConfirm={() => void create()}
    />}
  </section>
}
