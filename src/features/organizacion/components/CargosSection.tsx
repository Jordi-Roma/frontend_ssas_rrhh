import { useEffect, useState, type FormEvent } from 'react'
import { Plus } from 'lucide-react'
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
  actualizarCargo,
  crearCargo,
  eliminarCargo,
  type Cargo,
  type Departamento,
} from '../api/organizacionApi'

type Props = {
  cargos: Cargo[]
  departamentos: Departamento[]
  empresaId: string
  loading: boolean
  error: string | null
  onReload: () => void
}

const NIVELES = [
  { value: 'TRAINEE', label: 'Trainee / Pasante' },
  { value: 'JUNIOR', label: 'Junior' },
  { value: 'SEMI_SENIOR', label: 'Semi Senior' },
  { value: 'SENIOR', label: 'Senior' },
  { value: 'LEAD', label: 'Lead / Jefe' },
  { value: 'DIRECTOR', label: 'Director / Gerencial' },
]

type FormState = {
  nombre: string
  codigo: string
  departamentoId: string
  descripcion: string
  nivel: string
  salarioMin: string
  salarioMax: string
  activo: boolean
}

const INICIAL: FormState = {
  nombre: '',
  codigo: '',
  departamentoId: '',
  descripcion: '',
  nivel: 'JUNIOR',
  salarioMin: '',
  salarioMax: '',
  activo: true,
}

function toForm(cargo: Cargo): FormState {
  return {
    nombre: cargo.nombre,
    codigo: cargo.codigo ?? '',
    departamentoId: cargo.departamento_id ?? '',
    descripcion: cargo.descripcion ?? '',
    nivel: cargo.nivel ?? 'JUNIOR',
    salarioMin: cargo.salario_min != null ? String(cargo.salario_min) : '',
    salarioMax: cargo.salario_max != null ? String(cargo.salario_max) : '',
    activo: cargo.activo,
  }
}

export function CargosSection({ cargos, departamentos, empresaId, loading, error, onReload }: Props) {
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Cargo | null>(null)
  const [form, setForm] = useState<FormState>(INICIAL)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<Cargo | null>(null)
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

  function openEdit(cargo: Cargo) {
    setEditing(cargo)
    setForm(toForm(cargo))
    setFormError(null)
    setFormOpen(true)
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!form.nombre.trim()) {
      setFormError('El nombre del cargo es obligatorio.')
      return
    }
    const salarioMin = form.salarioMin === '' ? null : Number(form.salarioMin)
    const salarioMax = form.salarioMax === '' ? null : Number(form.salarioMax)
    if (salarioMin !== null && salarioMax !== null && salarioMax < salarioMin) {
      setFormError('El salario máximo no puede ser menor que el salario mínimo.')
      return
    }
    setSaving(true)
    setFormError(null)
    const payload = {
      nombre: form.nombre.trim(),
      codigo: form.codigo.trim().toUpperCase() || null,
      departamento_id: form.departamentoId || null,
      descripcion: form.descripcion.trim() || null,
      nivel: form.nivel || null,
      salario_min: salarioMin,
      salario_max: salarioMax,
      activo: form.activo,
    }
    try {
      if (editing) {
        await actualizarCargo(editing.id, payload, empresaId)
      } else {
        await crearCargo(payload, empresaId)
      }
      setFormOpen(false)
      onReload()
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'No se pudo guardar el cargo.')
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (deleting === null) return
    setDeleteError(null)
    try {
      await eliminarCargo(deleting.id, empresaId)
      setDeleting(null)
      onReload()
    } catch (cause) {
      setDeleteError(cause instanceof Error ? cause.message : 'No se pudo eliminar el cargo.')
    }
  }

  const columns: Column<Cargo>[] = [
    {
      key: 'codigo',
      header: 'Código',
      render: (item) => <code>{item.codigo || '—'}</code>,
    },
    {
      key: 'nombre',
      header: 'Puesto / Cargo',
      render: (item) => (
        <>
          <strong>{item.nombre}</strong>
          {item.descripcion && <small>{item.descripcion}</small>}
        </>
      ),
    },
    {
      key: 'departamento',
      header: 'Departamento',
      render: (item) => {
        const dept = departamentos.find((d) => d.id === item.departamento_id)
        return <span className="muted-cell">{dept?.nombre ?? 'Sin área'}</span>
      },
    },
    {
      key: 'nivel',
      header: 'Nivel',
      render: (item) => {
        const nivel = NIVELES.find((n) => n.value === item.nivel)
        return <Badge tone="neutral">{nivel?.label ?? item.nivel ?? 'General'}</Badge>
      },
    },
    {
      key: 'salario',
      header: 'Rango salarial',
      render: (item) =>
        item.salario_min != null || item.salario_max != null ? (
          <span className="strong-cell">
            Bs. {item.salario_min ?? '0'} - {item.salario_max ?? '—'}
          </span>
        ) : (
          <span className="muted-cell">—</span>
        ),
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
            Editar
          </Button>
          <Button variant="danger-outline" size="sm" onClick={() => setDeleting(item)}>
            Eliminar
          </Button>
        </div>
      ),
    },
  ]

  return (
    <Panel
      title="Cargos y posiciones"
      eyebrow="Puestos de trabajo con escala salarial de la empresa activa"
      actions={
        <Button variant="primary" onClick={openCreate}>
          <Plus size={17} aria-hidden="true" /> Nuevo cargo
        </Button>
      }
    >
      <DataTable<Cargo>
        columns={columns}
        rows={cargos}
        rowKey={(item) => item.id}
        loading={loading}
        error={error}
        onRetry={onReload}
        emptyMessage="No hay cargos registrados para esta empresa."
        caption="Cargos y posiciones definidos en la organización"
      />

      {formOpen && (
        <Modal
          onClose={() => setFormOpen(false)}
          title={editing ? `Editar cargo: ${editing.nombre}` : 'Nuevo cargo'}
          size="lg"
        >
          <form onSubmit={submit} className="user-form">
            <div className="form-grid">
              <Field label="Código" hint="Opcional. Ej. DEV-SR, REC-JR">
                <input
                  className="input"
                  value={form.codigo}
                  onChange={(e) => setForm({ ...form, codigo: e.target.value.toUpperCase() })}
                />
              </Field>
              <Field label="Nombre del cargo *" error={formError}>
                <input
                  className="input"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Ej. Desarrollador Fullstack"
                  required
                />
              </Field>
            </div>

            <div className="form-grid">
              <Field label="Departamento">
                <select
                  className="input"
                  value={form.departamentoId}
                  onChange={(e) => setForm({ ...form, departamentoId: e.target.value })}
                >
                  <option value="">-- Sin departamento --</option>
                  {departamentos.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nombre}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Nivel / Seniority">
                <select
                  className="input"
                  value={form.nivel}
                  onChange={(e) => setForm({ ...form, nivel: e.target.value })}
                >
                  {NIVELES.map((nivel) => (
                    <option key={nivel.value} value={nivel.value}>
                      {nivel.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="form-grid">
              <Field label="Salario mínimo referencial (Bs.)">
                <input
                  type="number"
                  min="0"
                  className="input"
                  value={form.salarioMin}
                  onChange={(e) => setForm({ ...form, salarioMin: e.target.value })}
                  placeholder="Ej. 5000"
                />
              </Field>
              <Field label="Salario máximo referencial (Bs.)">
                <input
                  type="number"
                  min="0"
                  className="input"
                  value={form.salarioMax}
                  onChange={(e) => setForm({ ...form, salarioMax: e.target.value })}
                  placeholder="Ej. 8000"
                />
              </Field>
            </div>

            <Field label="Descripción de funciones">
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
              Cargo activo para selección en vacantes
            </label>

            <div className="modal-footer">
              <Button variant="ghost" type="button" onClick={() => setFormOpen(false)}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit" loading={saving}>
                {editing ? 'Guardar cambios' : 'Crear cargo'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {deleting !== null && (
        <ConfirmDialog
          title="Eliminar cargo"
          message={
            <>
              ¿Seguro que deseas eliminar el cargo <strong>{deleting.nombre}</strong>? Las vacantes
              que lo referencien podrían quedar sin asignación.
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
