import { useCallback, useEffect, useState } from 'react'
import { DatabaseBackup, Download, RefreshCw, RotateCcw, Trash2 } from 'lucide-react'
import {
  Alert, Badge, Button, ConfirmDialog, EmptyState, Field, PageHeader, Panel,
} from '../../../shared/components'
import { respaldosApi, type Respaldo } from '../api/respaldosApi'

const RESTORE_PHRASE = 'RESTAURAR BASE DE DATOS'
const dateFormatter = new Intl.DateTimeFormat('es-BO', { dateStyle: 'medium', timeStyle: 'short' })

function formatBytes(value: number | null): string {
  if (value === null) return 'Pendiente'
  if (value < 1024) return `${value} B`
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / 1024 ** 2).toFixed(1)} MB`
}

function statusTone(status: string): 'neutral' | 'success' | 'warning' | 'danger' {
  if (status === 'COMPLETADO') return 'success'
  if (status === 'FALLIDO') return 'danger'
  if (status.includes('PROCESANDO') || status.includes('RESTAUR')) return 'warning'
  return 'neutral'
}

function isRunning(status: string): boolean {
  return ['PENDIENTE', 'PROCESANDO', 'RESTAURACION_PENDIENTE', 'RESTAURANDO'].includes(status)
}

export function RespaldosPage() {
  const [items, setItems] = useState<Respaldo[]>([])
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ tone: 'success' | 'error' | 'info'; text: string } | null>(null)
  const [restoreTarget, setRestoreTarget] = useState<Respaldo | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Respaldo | null>(null)
  const [confirmation, setConfirmation] = useState('')

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    try { setItems(await respaldosApi.list()) }
    catch (error) { setMessage({ tone: 'error', text: error instanceof Error ? error.message : 'No se pudieron consultar los respaldos.' }) }
    finally { if (!quiet) setLoading(false) }
  }, [])

  useEffect(() => { void load() }, [load])
  useEffect(() => {
    if (!items.some((item) => isRunning(item.estado))) return
    const timer = window.setInterval(() => void load(true), 4000)
    return () => window.clearInterval(timer)
  }, [items, load])

  async function createBackup() {
    setBusy(true); setMessage(null)
    try {
      await respaldosApi.create(name)
      setName('')
      setMessage({ tone: 'success', text: 'El respaldo comenzó a generarse.' })
      await load(true)
    } catch (error) {
      setMessage({ tone: 'error', text: error instanceof Error ? error.message : 'No se pudo iniciar el respaldo.' })
    } finally { setBusy(false) }
  }

  async function restoreBackup() {
    if (!restoreTarget) return
    setBusy(true)
    try {
      const result = await respaldosApi.restore(restoreTarget.id, confirmation)
      setMessage({ tone: 'info', text: result.mensaje })
      setRestoreTarget(null); setConfirmation('')
      await load(true)
    } catch (error) {
      setMessage({ tone: 'error', text: error instanceof Error ? error.message : 'No se pudo restaurar.' })
    } finally { setBusy(false) }
  }

  async function deleteBackup() {
    if (!deleteTarget) return
    setBusy(true)
    try {
      await respaldosApi.remove(deleteTarget.id)
      setDeleteTarget(null)
      setMessage({ tone: 'success', text: 'El respaldo fue eliminado.' })
      await load(true)
    } catch (error) {
      setMessage({ tone: 'error', text: error instanceof Error ? error.message : 'No se pudo eliminar.' })
    } finally { setBusy(false) }
  }

  return <section className="page-stack">
    <PageHeader
      eyebrow="Continuidad operativa"
      title="Backup / Restore"
      description="Respalda la base de datos, verifica su integridad y administra restauraciones controladas."
      actions={<Button variant="secondary" onClick={() => void load()} loading={loading}><RefreshCw size={17} aria-hidden="true" />Actualizar</Button>}
    />
    {message && <Alert tone={message.tone}>{message.text}</Alert>}
    <Panel title="Crear respaldo" eyebrow="Base de datos completa">
      <div className="backup-create-row">
        <Field label="Nombre opcional"><input value={name} maxLength={180} onChange={(event) => setName(event.target.value)} placeholder="Ej. Antes del cierre mensual" /></Field>
        <Button onClick={() => void createBackup()} loading={busy}><DatabaseBackup size={17} aria-hidden="true" />Crear respaldo</Button>
      </div>
      <p className="field-hint">El archivo se almacena en un bucket privado y se valida mediante SHA-256.</p>
    </Panel>
    <Panel title="Historial" count={`${items.length} respaldos`}>
      {loading && <p>Cargando respaldos…</p>}
      {!loading && items.length === 0 && <EmptyState title="Todavía no hay respaldos" message="Crea el primero antes de realizar cambios importantes en el sistema." />}
      {!loading && items.length > 0 && <div className="table-wrap"><table><thead><tr><th>Respaldo</th><th>Creado</th><th>Tamaño</th><th>Estado</th><th>Integridad</th><th>Acciones</th></tr></thead><tbody>
        {items.map((item) => <tr key={item.id}>
          <td><strong>{item.nombre}</strong><small>{item.formato.toUpperCase()}</small>{item.mensaje_error && <small className="backup-error">{item.mensaje_error}</small>}</td>
          <td>{dateFormatter.format(new Date(item.fecha_creacion))}{item.fecha_restauracion && <small>Restaurado: {dateFormatter.format(new Date(item.fecha_restauracion))}</small>}</td>
          <td>{formatBytes(item.tamano_bytes)}</td>
          <td><Badge tone={statusTone(item.estado)}>{item.estado.replaceAll('_', ' ')}</Badge></td>
          <td>{item.sha256 ? <code title={item.sha256}>{item.sha256.slice(0, 12)}…</code> : 'Pendiente'}</td>
          <td><div className="row-actions">
            <Button size="sm" variant="ghost" disabled={item.estado !== 'COMPLETADO'} onClick={() => void respaldosApi.download(item.id).catch((error: Error) => setMessage({ tone: 'error', text: error.message }))}><Download size={16} aria-hidden="true" />Descargar</Button>
            <Button size="sm" variant="ghost" disabled={item.estado !== 'COMPLETADO'} onClick={() => { setRestoreTarget(item); setConfirmation('') }}><RotateCcw size={16} aria-hidden="true" />Restaurar</Button>
            <button className="icon-button icon-button-danger" type="button" disabled={isRunning(item.estado)} title="Eliminar respaldo" aria-label={`Eliminar ${item.nombre}`} onClick={() => setDeleteTarget(item)}><Trash2 size={17} aria-hidden="true" /></button>
          </div></td>
        </tr>)}
      </tbody></table></div>}
    </Panel>
    {restoreTarget && <ConfirmDialog
      title="Restaurar toda la base de datos"
      tone="danger"
      confirmLabel="Iniciar restauración"
      loading={busy}
      onCancel={() => { setRestoreTarget(null); setConfirmation('') }}
      onConfirm={() => void restoreBackup()}
      message={<div className="restore-warning"><Alert tone="error">Esta operación reemplazará los datos actuales. No uses el sistema mientras esté en curso.</Alert><Field label={`Escribe: ${RESTORE_PHRASE}`}><input autoFocus value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></Field>{confirmation !== RESTORE_PHRASE && <p className="field-hint">La confirmación debe coincidir exactamente.</p>}</div>}
    />}
    {deleteTarget && <ConfirmDialog title="Eliminar respaldo" message={<>Se eliminará permanentemente <strong>{deleteTarget.nombre}</strong> del almacenamiento privado.</>} tone="danger" confirmLabel="Eliminar" loading={busy} onCancel={() => setDeleteTarget(null)} onConfirm={() => void deleteBackup()} />}
  </section>
}
