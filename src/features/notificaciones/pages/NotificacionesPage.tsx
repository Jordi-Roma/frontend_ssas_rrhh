import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert, Button, EmptyState, LoadingBlock, PageHeader, Panel } from '../../../shared/components'
import { useAsyncResource } from '../../../shared/hooks/useAsyncResource'
import { notificacionesApi } from '../api/notificacionesApi'

const notificationPaths = new Set(['/nomina/mis-boletas', '/personal/ausencias/mi', '/entrevistas'])

export function NotificacionesPage() {
  const [revision, setRevision] = useState(0)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(() => notificacionesApi.listar(), [revision])
  const resource = useAsyncResource(load)
  async function mark(id?: string) {
    setBusy(id ?? 'all'); setError(null)
    try {
      if (id) await notificacionesApi.leer(id)
      else await notificacionesApi.leerTodas()
      setRevision(value => value + 1)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo marcar la notificación.') }
    finally { setBusy(null) }
  }
  const items = resource.data ?? []
  return <section className="page-stack"><PageHeader eyebrow="Cuenta" title="Notificaciones" description="Avisos de tu actividad reciente." actions={items.some(item => !item.leida_en) ? <Button disabled={busy !== null} onClick={() => void mark()}>Marcar todas como leídas</Button> : undefined} />
    {error && <Alert tone="error">{error}</Alert>}
    {resource.loading ? <LoadingBlock message="Cargando notificaciones…" /> : resource.error ? <Alert tone="error">{resource.error} <Button size="sm" variant="secondary" onClick={() => setRevision(value => value + 1)}>Reintentar</Button></Alert> : items.length === 0 ? <EmptyState title="Sin notificaciones" message="No tienes avisos por ahora." /> : <Panel title="Centro de notificaciones" count={`${items.filter(item => !item.leida_en).length} sin leer`}><ul className="sprint4-lesson-list">{items.map(item => <li key={item.id}><span><strong>{item.titulo}</strong><small>{item.mensaje}</small><small>{new Date(item.fecha).toLocaleString('es-BO')}</small></span><div className="row-actions">{item.ruta && notificationPaths.has(item.ruta) && <Link to={item.ruta}>Ver</Link>}{!item.leida_en && <Button size="sm" variant="secondary" disabled={busy !== null} onClick={() => void mark(item.id)}>Marcar leída</Button>}</div></li>)}</ul></Panel>}
  </section>
}
