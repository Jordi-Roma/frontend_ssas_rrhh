import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { KeyRound, Plus, Power, Save, Settings2 } from 'lucide-react'
import type { components } from '../../../shared/api/schema'
import { useCompanyScope } from '../../../app/context/CompanyScopeContext'
import { Alert, Badge, Button, ConfirmDialog, DataTable, EmptyState, Field, Modal, PageHeader, Panel, type Column } from '../../../shared/components'
import { rolesApi } from '../api/rolesApi'

type Role = components['schemas']['RoleSchema']
type Permission = components['schemas']['PermisoSchema']
const humanizar = (text: string) => text.toLowerCase().replace(/[_-]/g, ' ').replace(/\b\w/g, (value) => value.toUpperCase())
const permissionName = (permission: Permission) => `${humanizar(permission.operacion)} ${humanizar(permission.recurso)}`

export function RolesPage() {
  const { company } = useCompanyScope()
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set())
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [saving, setSaving] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [roleToToggle, setRoleToToggle] = useState<Role | null>(null)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')

  async function load() {
    setStatus('loading'); setError(null)
    try {
      const [roleItems, permissionItems] = await Promise.all([rolesApi.list(company?.id), rolesApi.permisos()])
      setRoles(roleItems); setPermissions(permissionItems); setStatus('success')
    } catch (cause) {
      setStatus('error'); setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los roles.')
    }
  }
  useEffect(() => { void load() }, [company?.id])

  const groups = useMemo(() => {
    const result: Record<string, Permission[]> = {}
    permissions.forEach((permission) => {
      const key = permission.modulo?.toUpperCase() ?? 'GENERAL'
      result[key] = [...(result[key] ?? []), permission]
    })
    return Object.entries(result).sort(([a], [b]) => a.localeCompare(b))
  }, [permissions])

  function edit(role: Role) {
    setSelectedRole(role)
    setSelectedPermissions(new Set((role.permissions ?? []).map((permission) => permission.id)))
    setMessage(null); setError(null)
  }

  function togglePermission(id: string) {
    setSelectedPermissions((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function toggleGroup(group: Permission[]) {
    const allSelected = group.every((permission) => selectedPermissions.has(permission.id))
    setSelectedPermissions((current) => {
      const next = new Set(current)
      group.forEach((permission) => allSelected ? next.delete(permission.id) : next.add(permission.id))
      return next
    })
  }

  async function savePermissions() {
    if (!selectedRole) return
    setSaving(true); setError(null)
    try {
      const updated = await rolesApi.assignPermissions(selectedRole.id, [...selectedPermissions], company?.id)
      setRoles((current) => current.map((role) => role.id === updated.id ? updated : role))
      setSelectedRole(updated); setMessage(`Permisos de "${updated.name}" actualizados.`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudieron guardar los permisos.')
    } finally { setSaving(false) }
  }

  async function createRole(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(null)
    try {
      await rolesApi.create({ name: name.trim(), codigo: code.trim(), description: description.trim() || null }, company?.id)
      setName(''); setCode(''); setDescription(''); setShowCreate(false); setMessage('Rol creado correctamente.')
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo crear el rol.')
    } finally { setSaving(false) }
  }

  async function toggleStatus() {
    if (!roleToToggle) return
    const active = !roleToToggle.is_active
    try {
      await rolesApi.update(roleToToggle.id, { is_active: active }, company?.id)
      if (selectedRole?.id === roleToToggle.id) setSelectedRole(null)
      setMessage(`Rol "${roleToToggle.name}" ${active ? 'activado' : 'desactivado'}.`); setRoleToToggle(null)
      await load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo cambiar el estado.') }
  }

  const columns: Column<Role>[] = [
    { key: 'name', header: 'Nombre', render: (role) => <strong>{role.name}</strong> },
    { key: 'code', header: 'Código', render: (role) => <code className="code-chip">{role.codigo}</code> },
    { key: 'permissions', header: 'Permisos', render: (role) => <Badge tone="neutral">{role.permissions?.length ?? 0} permisos</Badge> },
    { key: 'status', header: 'Estado', render: (role) => <Badge tone={role.is_active ? 'success' : 'warning'}>{role.is_active ? 'Activo' : 'Inactivo'}</Badge> },
    { key: 'actions', header: 'Acciones', align: 'right', render: (role) => <div className="row-actions">
      <Button variant="secondary" size="sm" onClick={() => edit(role)} disabled={role.es_base} title={role.es_base ? 'Rol protegido por el sistema' : 'Configurar permisos'}><Settings2 size={16} aria-hidden="true" />{role.es_base ? 'Protegido' : 'Permisos'}</Button>
      {!role.es_base && <button className="icon-button icon-button-danger" type="button" onClick={() => setRoleToToggle(role)} title={role.is_active ? 'Desactivar rol' : 'Activar rol'} aria-label={`${role.is_active ? 'Desactivar' : 'Activar'} ${role.name}`}><Power size={17} aria-hidden="true" /></button>}
    </div> },
  ]

  return <div className="page-stack">
    <PageHeader eyebrow="Seguridad y control de acceso" title="Roles y permisos" description="Administra perfiles y permisos de la empresa activa." actions={<Button onClick={() => { setError(null); setShowCreate(true) }}><Plus size={17} aria-hidden="true" />Nuevo rol</Button>} />
    {message && <Alert tone="success" title="Operación completada">{message}</Alert>}
    {error && !showCreate && <Alert tone="error" title="No se pudo completar la operación">{error}</Alert>}
    <Panel title="Roles configurados" count={`${roles.length} perfiles disponibles`}>
      {status === 'success' && roles.length === 0
        ? <EmptyState title="Todavía no hay roles" message="Crea el primer perfil y luego asigna sus permisos." action={<Button onClick={() => setShowCreate(true)}><Plus size={17} aria-hidden="true" />Crear rol</Button>} />
        : <DataTable columns={columns} rows={roles} rowKey={(role) => role.id} loading={status === 'loading'} error={status === 'error' ? error : null} onRetry={() => void load()} caption="Roles de la empresa activa" />}
    </Panel>

    {selectedRole && <Panel title={`Permisos de ${selectedRole.name}`} count={`${selectedPermissions.size} de ${permissions.length} seleccionados`} actions={<Button variant="ghost" size="sm" onClick={() => setSelectedRole(null)}>Cerrar editor</Button>}>
      <div className="role-permissions">{groups.map(([module, group]) => {
        const selected = group.filter((permission) => selectedPermissions.has(permission.id)).length
        return <section className="permission-group" key={module}>
          <div className="permission-group-header"><div className="permission-group-title"><KeyRound size={17} aria-hidden="true" /><strong>{humanizar(module)}</strong><Badge tone={selected ? 'success' : 'neutral'}>{selected} / {group.length}</Badge></div><Button variant="ghost" size="sm" onClick={() => toggleGroup(group)}>{selected === group.length ? 'Quitar todos' : 'Seleccionar todos'}</Button></div>
          <div className="permission-grid">{group.map((permission) => {
            const checked = selectedPermissions.has(permission.id)
            return <label className={`permission-option${checked ? ' selected' : ''}`} key={permission.id}><input type="checkbox" checked={checked} onChange={() => togglePermission(permission.id)} /><span><strong>{permissionName(permission)}</strong><small>{permission.descripcion || permission.codigo}</small></span></label>
          })}</div>
        </section>
      })}</div>
      <div className="sticky-actions"><Button loading={saving} onClick={() => void savePermissions()}><Save size={17} aria-hidden="true" />Guardar permisos</Button></div>
    </Panel>}

    {showCreate && <Modal title="Nuevo rol" onClose={() => setShowCreate(false)}><form className="form-stack" onSubmit={createRole}>
      <Field label="Nombre del rol *"><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ej. Reclutador senior" required /></Field>
      <Field label="Código *" hint="Usa mayúsculas, números y guion bajo."><input value={code} onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))} placeholder="RECLUTADOR_SENIOR" required /></Field>
      <Field label="Descripción"><textarea value={description} onChange={(event) => setDescription(event.target.value)} /></Field>
      {error && <Alert tone="error">{error}</Alert>}
      <div className="modal-footer"><Button variant="ghost" onClick={() => setShowCreate(false)}>Cancelar</Button><Button type="submit" loading={saving}><Plus size={17} aria-hidden="true" />Crear rol</Button></div>
    </form></Modal>}

    {roleToToggle && <ConfirmDialog title={roleToToggle.is_active ? 'Desactivar rol' : 'Activar rol'} message={`¿Deseas ${roleToToggle.is_active ? 'desactivar' : 'activar'} el rol "${roleToToggle.name}"?`} confirmLabel={roleToToggle.is_active ? 'Desactivar' : 'Activar'} tone={roleToToggle.is_active ? 'danger' : 'primary'} onConfirm={() => void toggleStatus()} onCancel={() => setRoleToToggle(null)} />}
  </div>
}
