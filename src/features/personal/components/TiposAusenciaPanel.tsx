import { useCallback, useState } from 'react'
import type { FormEvent } from 'react'
import { useAccess } from '../../../app/access/AccessProvider'
import { Alert, Badge, Button, DataTable, Field, Panel } from '../../../shared/components'
import { useAsyncResource } from '../../../shared/hooks/useAsyncResource'
import { crearTipoAusencia, editarTipoAusencia, getTiposAusencia, getTiposAusenciaConfiguracion, type TipoAusencia, type TipoAusenciaInput } from '../api/ausenciasApi'

const empty: TipoAusenciaInput = { codigo: '', nombre: '', es_remunerado: true, descuenta_vacacion: false, requiere_documento: false, dias_maximos_anio: null }

export function TiposAusenciaPanel({ empresaId }: { empresaId: string }) {
  const { can } = useAccess()
  const write = can('ausencias:gestionar', 'platform:ausencias:gestionar')
  const load = useCallback(() => write ? getTiposAusenciaConfiguracion(empresaId) : getTiposAusencia(empresaId), [empresaId, write])
  const resource = useAsyncResource(load)
  const [editing, setEditing] = useState<TipoAusencia | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<TipoAusenciaInput>(empty)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function start(row?: TipoAusencia) {
    setEditing(row ?? null)
    setForm(row ? { codigo: row.codigo, nombre: row.nombre, es_remunerado: row.es_remunerado, descuenta_vacacion: row.descuenta_vacacion, requiere_documento: row.requiere_documento, dias_maximos_anio: row.dias_maximos_anio } : empty)
    setError(null); setOpen(true)
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!write || busy) return
    setBusy(true); setError(null)
    try {
      if (editing) await editarTipoAusencia(empresaId, editing.id, { ...form, activo: editing.activo })
      else await crearTipoAusencia(empresaId, { ...form, codigo: form.codigo.trim().toUpperCase() })
      setOpen(false); await resource.reload()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo guardar el tipo de ausencia.') }
    finally { setBusy(false) }
  }

  async function toggle(row: TipoAusencia) {
    if (!write || busy) return
    setBusy(true); setError(null)
    try {
      await editarTipoAusencia(empresaId, row.id, { nombre: row.nombre, es_remunerado: row.es_remunerado, descuenta_vacacion: row.descuenta_vacacion, requiere_documento: row.requiere_documento, dias_maximos_anio: row.dias_maximos_anio, activo: !row.activo })
      await resource.reload()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo cambiar el estado.') }
    finally { setBusy(false) }
  }

  return <Panel title="Tipos de ausencia" eyebrow="Catálogo de la empresa" actions={write && <Button size="sm" onClick={() => start()}>Crear tipo</Button>}>
    {error && <Alert tone="error">{error}</Alert>}
    {open && write && <form className="form-stack" onSubmit={event => void save(event)}>
      <div className="form-grid">
        <Field label="Código" hint="Único, por ejemplo LICENCIA_ESTUDIO"><input required minLength={2} maxLength={40} pattern="[A-Za-z][A-Za-z0-9_]*" value={form.codigo} disabled={!!editing || busy} onChange={event => setForm({ ...form, codigo: event.target.value.toUpperCase() })} /></Field>
        <Field label="Nombre"><input required minLength={2} maxLength={120} value={form.nombre} disabled={busy} onChange={event => setForm({ ...form, nombre: event.target.value })} /></Field>
        <Field label="Máximo de días al año" hint="Opcional"><input type="number" min={1} max={366} value={form.dias_maximos_anio ?? ''} disabled={busy} onChange={event => setForm({ ...form, dias_maximos_anio: event.target.value ? Number(event.target.value) : null })} /></Field>
      </div>
      <div className="form-grid">
        <Field label="Remunerada"><input type="checkbox" checked={form.es_remunerado} disabled={busy} onChange={event => setForm({ ...form, es_remunerado: event.target.checked, descuenta_vacacion: event.target.checked ? form.descuenta_vacacion : false })} /></Field>
        <Field label="Descuenta vacaciones"><input type="checkbox" checked={form.descuenta_vacacion} disabled={busy || !form.es_remunerado} onChange={event => setForm({ ...form, descuenta_vacacion: event.target.checked })} /></Field>
        <Field label="Exige comprobante"><input type="checkbox" checked={form.requiere_documento} disabled={busy} onChange={event => setForm({ ...form, requiere_documento: event.target.checked })} /></Field>
      </div>
      <Alert tone="info">Si ya existen solicitudes de este tipo, sus reglas no se podrán cambiar. Podrás modificar el nombre o desactivarlo.</Alert>
      <div className="form-actions"><Button type="submit" loading={busy}>{editing ? 'Guardar cambios' : 'Crear tipo'}</Button><Button variant="secondary" disabled={busy} onClick={() => setOpen(false)}>Cancelar</Button></div>
    </form>}
    <DataTable<TipoAusencia> rows={resource.data ?? []} rowKey={item => item.id} loading={resource.loading} error={resource.error} onRetry={resource.reload} emptyMessage="No hay tipos de ausencia para esta empresa." caption="Tipos de ausencia"
      columns={[
        { key: 'nombre', header: 'Tipo', render: item => <><strong>{item.nombre}</strong><small> · {item.codigo}</small></> },
        { key: 'remunerado', header: 'Pago', render: item => <Badge tone={item.es_remunerado ? 'success' : 'neutral'}>{item.es_remunerado ? 'Remunerada' : 'Sin goce'}</Badge> },
        { key: 'reglas', header: 'Reglas', render: item => [item.descuenta_vacacion ? 'Descuenta vacaciones' : '', item.requiere_documento ? 'Pide comprobante' : ''].filter(Boolean).join(' · ') || 'Sin requisitos adicionales' },
        ...(write ? [
          { key: 'estado', header: 'Estado', render: (item: TipoAusencia) => <Badge tone={item.activo ? 'success' : 'neutral'}>{item.activo ? 'Activo' : 'Inactivo'}</Badge> },
          { key: 'acciones', header: 'Acciones', render: (item: TipoAusencia) => <div className="form-actions"><Button size="sm" variant="secondary" disabled={busy} onClick={() => start(item)}>Editar</Button><Button size="sm" variant="ghost" disabled={busy} onClick={() => void toggle(item)}>{item.activo ? 'Desactivar' : 'Activar'}</Button></div> },
        ] : []),
      ]} />
  </Panel>
}
