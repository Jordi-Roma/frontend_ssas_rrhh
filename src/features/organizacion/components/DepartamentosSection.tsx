import { useEffect, useState, type FormEvent } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import {
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  Field,
  Modal,
  Panel,
  type Column,
} from '../../../shared/components'
import {
  actualizarDepartamento,
  crearDepartamento,
  eliminarDepartamento,
  type Departamento,
} from '../api/organizacionApi'

type Props = {
  departamentos: Departamento[]
  empresaId: string
  loading: boolean
  error: string | null
  onReload: () => void
}

type FormState = {
  nombre: string
  codigo: string
  descripcion: string
  padreId: string
  activo: boolean
}

const INICIAL: FormState = { nombre: '', codigo: '', descripcion: '', padreId: '', activo: true }

export function DepartamentosSection({ departamentos, empresaId, loading, error, onReload }: Props) {
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Departamento | null>(null)
  const [form, setForm] = useState<FormState>(INICIAL)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<Departamento | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    setFormOpen(false)
    setEditing(null)
    setDeleting(null)
  }, [empresaId])

  function openCreate() {
    setEditing(null)
    setForm(INICIAL)
    setFormError(null)
    setFormOpen(true)
  }

  function openEdit(departamento: Departamento) {
    setEditing(departamento)
    setForm({
      nombre: departamento.nombre,
      codigo: departamento.codigo ?? '',
      descripcion: departamento.descripcion ?? '',
      padreId: departamento.departamento_padre_id ?? '',
      activo: departamento.activo,
    })
    setFormError(null)
    setFormOpen(true)
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!form.nombre.trim()) {
      setFormError('El nombre es obligatorio.')
      return
    }
    setSaving(true)
    setFormError(null)
    const payload = {
      nombre: form.nombre.trim(),
      codigo: form.codigo.trim().toUpperCase() || null,
      descripcion: form.descripcion.trim() || null,
      departamento_padre_id: form.padreId || null,
      activo: form.activo,
    }
    try {
      if (editing) {
        await actualizarDepartamento(editing.id, payload, empresaId)
      } else {
        await crearDepartamento(payload, empresaId)
      }
      setFormOpen(false)
      onReload()
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'No se pudo guardar el departamento.')
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (deleting === null) return
    setDeleteError(null)
    try {
      await eliminarDepartamento(deleting.id, empresaId)
      setDeleting(null)
      onReload()
    } catch (cause) {
      setDeleteError(cause instanceof Error ? cause.message : 'No se pudo eliminar el departamento.')
    }
  }

  // Evita ciclos: un departamento no puede ser su propio padre ni el de sus descendientes.
  function subtreeIds(rootId: string): Set<string> {
    const ids = new Set([rootId])
    let growing = true
    while (growing) {
      growing = false
      for (const item of departamentos) {
        if (item.departamento_padre_id != null && ids.has(item.departamento_padre_id) && !ids.has(item.id)) {
          ids.add(item.id)
          growing = true
        }
      }
    }
    return ids
  }

  const bloquedosParaPadre = editing !== null ? subtreeIds(editing.id) : new Set<string>()

  const columns: Column<Departamento>[] = [
    {
      key: 'codigo',
      header: 'Código',
      render: (item) => <code>{item.codigo || '—'}</code>,
    },
    {
      key: 'nombre',
      header: 'Departamento',
      render: (item) => (
        <>
          <strong>{item.nombre}</strong>
          {item.descripcion && <small>{item.descripcion}</small>}
        </>
      ),
    },
    {
      key: 'padre',
      header: 'Área padre',
      render: (item) => {
        const padre = departamentos.find((d) => d.id === item.departamento_padre_id)
        return <span className="muted-cell">{padre?.nombre ?? '—'}</span>
      },
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (item) => (
        <Badge tone={item.activo ? 'success' : 'warning'}>{item.activo ? 'Activo' : 'Inactivo'}</Badge>
      ),
    },
    {
      key: 'acciones',
      header: 'Acciones',
      align: 'right',
      render: (item) => (
        <div className="row-actions">
          <Button variant="secondary" size="sm" onClick={() => openEdit(item)}>
            <Pencil size={16} aria-hidden="true" /> Editar
          </Button>
          <button className="icon-button icon-button-danger" type="button" onClick={() => setDeleting(item)} title="Eliminar departamento" aria-label={`Eliminar ${item.nombre}`}><Trash2 size={17} aria-hidden="true" /></button>
        </div>
      ),
    },
  ]

  return (
    <Panel
      title="Departamentos"
      eyebrow="Estructura organizativa de la empresa activa"
      actions={
        <Button variant="primary" onClick={openCreate}>
          <Plus size={17} aria-hidden="true" /> Nuevo departamento
        </Button>
      }
    >
      <DataTable<Departamento>
        columns={columns}
        rows={departamentos}
        rowKey={(item) => item.id}
        loading={loading}
        error={error}
        onRetry={onReload}
        emptyMessage="No hay departamentos registrados para esta empresa."
        caption="Departamentos de la estructura organizativa"
      />

      {formOpen && (
        <Modal
          onClose={() => setFormOpen(false)}
          title={editing ? `Editar departamento: ${editing.nombre}` : 'Nuevo departamento'}
          size="lg"
        >
          <form onSubmit={submit} className="user-form">
            <div className="form-grid">
              <Field label="Código" hint="Opcional. Ej. RRHH, IT, FIN">
                <input
                  className="input"
                  value={form.codigo}
                  onChange={(e) => setForm({ ...form, codigo: e.target.value.toUpperCase() })}
                />
              </Field>
              <Field label="Nombre *" error={formError}>
                <input
                  className="input"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Ej. Recursos Humanos"
                  required
                />
              </Field>
            </div>

            <Field label="Departamento padre (jerarquía)">
              <select
                className="input"
                value={form.padreId}
                onChange={(e) => setForm({ ...form, padreId: e.target.value })}
              >
                <option value="">Ninguno (área principal)</option>
                {departamentos
                  .filter((item) => !bloquedosParaPadre.has(item.id))
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nombre} {item.codigo ? `(${item.codigo})` : ''}
                    </option>
                  ))}
              </select>
            </Field>

            <Field label="Descripción">
              <textarea
                className="input"
                rows={3}
                value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              />
            </Field>

            <label className="check-label">
              <input
                type="checkbox"
                checked={form.activo}
                onChange={(e) => setForm({ ...form, activo: e.target.checked })}
              />
              Área activa
            </label>

            <div className="modal-footer">
              <Button variant="ghost" type="button" onClick={() => setFormOpen(false)}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit" loading={saving}>
                {editing ? 'Guardar cambios' : 'Crear departamento'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {deleting !== null && (
        <ConfirmDialog
          title="Eliminar departamento"
          message={
            <>
              ¿Seguro que deseas eliminar <strong>{deleting.nombre}</strong>? Los departamentos
              que dependan de esta área quedarán sin padre.
            </>
          }
          confirmLabel="Eliminar"
          tone="danger"
          loading={saving}
          error={deleteError}
          onConfirm={() => void confirmDelete()}
          onCancel={() => setDeleting(null)}
        />
      )}
    </Panel>
  )
}
