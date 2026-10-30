import { useEffect, useState, type FormEvent } from 'react'
import { Pencil, Plus, Power } from 'lucide-react'
import { useCompanyScope } from '../../../app/context/CompanyScopeContext'
import {
  Alert,
  Badge,
  Button,
  DataTable,
  EmptyState,
  Field,
  Modal,
  PageHeader,
  Panel,
  LoadingBlock,
  type Column,
} from '../../../shared/components'
import {
  actualizarHabilidad,
  crearHabilidad,
  listarHabilidades,
  type Habilidad,
} from '../api/habilidadesApi'

export function HabilidadesPage() {
  const { company, loading: scopeLoading } = useCompanyScope()
  const empresaId = company?.id ?? null

  const [items, setItems] = useState<Habilidad[]>([])
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Habilidad | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  // Modal Form State
  const [formNombre, setFormNombre] = useState('')
  const [formCategoria, setFormCategoria] = useState('Técnica')
  const [formDescripcion, setFormDescripcion] = useState('')
  const [formActivo, setFormActivo] = useState(true)

  function load() {
    if (empresaId === null) {
      setItems([])
      setLoading(false)
      setLoadError(null)
      return
    }
    setLoading(true)
    setLoadError(null)
    listarHabilidades(empresaId)
      .then(setItems)
      .catch((cause: unknown) => {
        setItems([])
        setLoadError(cause instanceof Error ? cause.message : 'No se pudieron cargar las habilidades.')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    setMessage(null)
    setShowModal(false)
    setEditing(null)
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId])

  function openCreate() {
    setEditing(null)
    setFormNombre('')
    setFormCategoria('Técnica')
    setFormDescripcion('')
    setFormActivo(true)
    setFormError(null)
    setShowModal(true)
  }

  function openEdit(item: Habilidad) {
    setEditing(item)
    setFormNombre(item.nombre)
    setFormCategoria(item.categoria ?? 'General')
    setFormDescripcion(item.descripcion ?? '')
    setFormActivo(item.activo)
    setFormError(null)
    setShowModal(true)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (empresaId === null) return
    if (!formNombre.trim()) return
    setSaving(true)
    setFormError(null)
    setMessage(null)

    const payload = {
      nombre: formNombre.trim(),
      categoria: formCategoria.trim() || null,
      descripcion: formDescripcion.trim() || null,
      activo: formActivo,
    }

    try {
      if (editing) {
        await actualizarHabilidad(empresaId, editing.id, payload)
        setMessage(`Habilidad "${formNombre}" actualizada correctamente.`)
      } else {
        await crearHabilidad(empresaId, payload)
        setMessage(`Habilidad "${formNombre}" agregada al catálogo.`)
      }
      setShowModal(false)
      load()
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'No se pudo guardar la habilidad.')
    } finally {
      setSaving(false)
    }
  }

  const toggleStatus = async (item: Habilidad) => {
    if (empresaId === null) return
    try {
      await actualizarHabilidad(empresaId, item.id, { activo: !item.activo })
      setMessage(`Estado de "${item.nombre}" cambiado a ${!item.activo ? 'activo' : 'inactivo'}.`)
      load()
    } catch (cause) {
      setLoadError(cause instanceof Error ? cause.message : 'No se pudo cambiar el estado.')
    }
  }

  const filteredItems = items.filter((item) => {
    const s = search.toLowerCase()
    return (
      item.nombre.toLowerCase().includes(s) ||
      (item.categoria && item.categoria.toLowerCase().includes(s))
    )
  })

  const columns: Column<Habilidad>[] = [
    {
      key: 'nombre',
      header: 'Habilidad',
      render: (item) => <strong>{item.nombre}</strong>,
    },
    {
      key: 'categoria',
      header: 'Categoría',
      render: (item) => <Badge tone="neutral">{item.categoria || 'General'}</Badge>,
    },
    {
      key: 'descripcion',
      header: 'Descripción',
      render: (item) => <span className="muted-cell">{item.descripcion || '—'}</span>,
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (item) => (
        <Badge tone={item.activo ? 'success' : 'warning'}>{item.activo ? 'Activa' : 'Inactiva'}</Badge>
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
          <button className="icon-button icon-button-danger" type="button" onClick={() => void toggleStatus(item)} title={item.activo ? 'Desactivar habilidad' : 'Activar habilidad'} aria-label={`${item.activo ? 'Desactivar' : 'Activar'} ${item.nombre}`}><Power size={17} aria-hidden="true" /></button>
        </div>
      ),
    },
  ]

  if (scopeLoading) {
    return <LoadingBlock message="Resolviendo empresa activa…" />
  }

  if (empresaId === null) {
    return (
      <div className="page-stack">
        <EmptyState
          title="Selecciona una empresa"
          message="Elige la empresa activa desde el encabezado para gestionar su catálogo de habilidades."
        />
      </div>
    )
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Reclutamiento y Selección"
        title="Catálogo de Habilidades y Competencias"
        description="Competencias técnicas y blandas utilizadas para calificar candidatos y asociar requisitos a vacantes."
        actions={
          <Button variant="primary" onClick={openCreate}>
            <Plus size={17} aria-hidden="true" /> Nueva habilidad
          </Button>
        }
      />

      {message && (
        <div className="content-alert">
          <Alert tone="success" title="Éxito">
            {message}
          </Alert>
        </div>
      )}

      <Panel
        title="Catálogo Institucional"
        eyebrow={loadError ? 'Sin datos' : `${items.length} habilidades configuradas`}
      >
        <div className="compact-control">
          <input
            className="input"
            placeholder="Buscar por nombre o categoría..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <DataTable<Habilidad>
          columns={columns}
          rows={filteredItems}
          rowKey={(item) => item.id}
          loading={loading}
          error={loadError}
          onRetry={load}
          emptyMessage={
            search.trim() !== ''
              ? 'No hay habilidades que coincidan con la búsqueda.'
              : 'No se encontraron habilidades registradas para esta empresa.'
          }
          caption="Catálogo de habilidades de la empresa activa"
        />
      </Panel>

      {showModal && (
        <Modal
          onClose={() => setShowModal(false)}
          title={editing ? `Editar Habilidad: ${editing.nombre}` : 'Nueva Habilidad'}
        >
          <form onSubmit={handleSubmit} className="user-form">
            <Field label="Nombre de la competencia o habilidad *">
              <input
                className="input"
                placeholder="Ej. Python, Liderazgo, SQL, Figma..."
                value={formNombre}
                onChange={(e) => setFormNombre(e.target.value)}
                required
              />
            </Field>

            <Field label="Categoría">
              <select
                className="input"
                value={formCategoria}
                onChange={(e) => setFormCategoria(e.target.value)}
              >
                <option value="Técnica">Técnica / Hard Skill</option>
                <option value="Blanda">Blanda / Soft Skill</option>
                <option value="Idioma">Idioma</option>
                <option value="Certificación">Certificación</option>
                <option value="Metodología">Metodología / Framework</option>
                <option value="General">General</option>
              </select>
            </Field>

            <Field label="Descripción de la competencia">
              <textarea
                className="input"
                rows={3}
                placeholder="Detalles sobre lo que califica esta competencia..."
                value={formDescripcion}
                onChange={(e) => setFormDescripcion(e.target.value)}
              />
            </Field>

            <label className="check-label">
              <input
                type="checkbox"
                checked={formActivo}
                onChange={(e) => setFormActivo(e.target.checked)}
              />
              Habilidad activa para asociar a vacantes
            </label>

            {formError && (
              <Alert tone="error" title="Error">
                {formError}
              </Alert>
            )}

            <div className="modal-footer">
              <Button variant="ghost" type="button" onClick={() => setShowModal(false)}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit" loading={saving}>
                {editing ? 'Guardar cambios' : 'Crear habilidad'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
