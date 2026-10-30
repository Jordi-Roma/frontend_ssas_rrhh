import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Can, useAccess } from '../../../app/access/AccessProvider'
import { useCompanyScope } from '../../../app/context/CompanyScopeContext'
import { useAuth } from '../../auth/hooks/useAuth'
import { ApiError } from '../../../shared/api/httpClient'
import type { components } from '../../../shared/api/schema'
import {
  Alert,
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  Field,
  Modal,
  PageHeader,
  Pagination,
  Panel,
} from '../../../shared/components'
import type { Column } from '../../../shared/components'
import { rolesAsignablesApi } from '../api/rolesAsignablesApi'
import { usuariosApi } from '../api/usuariosApi'
import { evaluarPassword, generarPassword, passwordEsValida } from '../utils/passwordPolicy'

type User = components['schemas']['UsuarioResponse']
type Role = components['schemas']['RoleSchema']

type UserScope = 'company' | 'platform'

type AccionPendiente = {
  usuario: User
  tipo: 'desactivar' | 'activar' | 'eliminar' | 'restaurar' | 'desbloquear'
}

const TITULO_ACCION: Record<AccionPendiente['tipo'], string> = {
  desactivar: 'Desactivar usuario',
  activar: 'Activar usuario',
  eliminar: 'Eliminar usuario',
  restaurar: 'Restaurar usuario',
  desbloquear: 'Desbloquear usuario',
}

const DETALLE_ACCION: Record<AccionPendiente['tipo'], string> = {
  desactivar: 'No podrá iniciar sesión hasta que lo actives de nuevo.',
  activar: 'Podrá volver a iniciar sesión con sus credenciales actuales.',
  eliminar: 'Se revocan sus sesiones y deja de aparecer en el listado. Podrás restaurarlo después.',
  restaurar: 'Vuelve al listado, pero queda inactivo: tendrás que activarlo.',
  desbloquear: 'Se borran los intentos fallidos y el bloqueo temporal por seguridad.',
}

const FORM_VACIO = {
  nombre: '',
  apellido: '',
  email: '',
  username: '',
  password: '',
  telefono: '',
  role_ids: [] as string[],
  exigir_verificacion: false,
}

const PERM_VER = ['usuarios:ver', 'platform:usuarios:gestionar']
const PERM_CREAR = ['usuarios:crear', 'platform:usuarios:gestionar']
const PERM_EDITAR = ['usuarios:editar', 'platform:usuarios:gestionar']
const PERM_ELIMINAR = ['usuarios:eliminar', 'platform:usuarios:gestionar']
const PERM_RESTAURAR = ['usuarios:restaurar', 'platform:usuarios:gestionar']
const PERM_PASSWORD = ['usuarios:cambiar_password', 'platform:usuarios:gestionar']
const PERM_DESBLOQUEAR = ['usuarios:desbloquear', 'platform:usuarios:gestionar']

export function ListadoUsuariosPage({ scope }: { scope: UserScope }) {
  const { user } = useAuth()
  const { company } = useCompanyScope()
  const { can } = useAccess()
  const esVistaGlobal = scope === 'platform'

  const [usuarios, setUsuarios] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(25)
  const [search, setSearch] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState('')
  const [incluirEliminados, setIncluirEliminados] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mensaje, setMensaje] = useState<string | null>(null)

  const [roles, setRoles] = useState<Role[]>([])
  const [rolesError, setRolesError] = useState<string | null>(null)

  const [showCreate, setShowCreate] = useState(false)
  const [editando, setEditando] = useState<User | null>(null)
  const [cambiandoClave, setCambiandoClave] = useState<User | null>(null)
  const [accion, setAccion] = useState<AccionPendiente | null>(null)

  const [guardando, setGuardando] = useState(false)
  const [errorFormulario, setErrorFormulario] = useState<string | null>(null)
  const [erroresCampo, setErroresCampo] = useState<Record<string, string>>({})

  const [createForm, setCreateForm] = useState(FORM_VACIO)
  const [editForm, setEditForm] = useState({ ...FORM_VACIO, password: '' })
  const [nuevaClave, setNuevaClave] = useState('')
  const [exigirCambio, setExigirCambio] = useState(true)

  const empresaLectura = esVistaGlobal ? undefined : (company?.id ?? user?.empresaId ?? undefined)
  const empresaAlta = empresaLectura

  const cargar = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const pagina = await usuariosApi.list({
        empresa_id: empresaLectura,
        search: busqueda.trim() || undefined,
        is_active: estadoFiltro === '' ? undefined : estadoFiltro === 'true',
        incluir_eliminados: incluirEliminados || undefined,
        page,
        per_page: perPage,
      })
      setUsuarios(pagina.items)
      setTotal(pagina.total)
    } catch (cause) {
      // Un fallo no se muestra como «no hay usuarios»: son cosas distintas.
      setUsuarios([])
      setTotal(0)
      setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los usuarios.')
    } finally {
      setLoading(false)
    }
  }, [empresaLectura, busqueda, estadoFiltro, incluirEliminados, page, perPage])

  useEffect(() => {
    void cargar()
  }, [cargar])

  // Los roles asignables dependen del alcance de la pantalla.
  // Enviar un rol de otro ámbito hace que el backend rechace el alta.
  useEffect(() => {
    let activo = true
    setRolesError(null)
    rolesAsignablesApi
      .list(empresaAlta)
      .then((lista) => {
        if (activo) setRoles(lista)
      })
      .catch((cause: unknown) => {
        if (!activo) return
        setRoles([])
        setRolesError(cause instanceof Error ? cause.message : 'No se pudieron cargar los roles.')
      })
    return () => {
      activo = false
    }
  }, [empresaAlta])

  const requisitos = useMemo(
    () => evaluarPassword(createForm.password, createForm.username, createForm.email),
    [createForm.password, createForm.username, createForm.email],
  )
  const requisitosClave = useMemo(
    () => evaluarPassword(nuevaClave, cambiandoClave?.username, cambiandoClave?.email),
    [nuevaClave, cambiandoClave],
  )

  function limpiarErrores() {
    setErrorFormulario(null)
    setErroresCampo({})
  }

  function registrarError(cause: unknown, porDefecto: string) {
    if (cause instanceof ApiError) {
      setErroresCampo(cause.fieldErrors)
      setErrorFormulario(cause.message)
      return
    }
    setErrorFormulario(cause instanceof Error ? cause.message : porDefecto)
  }

  async function crear(evento: FormEvent) {
    evento.preventDefault()
    limpiarErrores()

    // Validación previa: el backend exige al menos un rol y una contraseña fuerte.
    if (createForm.role_ids.length === 0) {
      setErroresCampo({ role_ids: 'Selecciona al menos un rol.' })
      setErrorFormulario('El usuario necesita al menos un rol para poder iniciar sesión.')
      return
    }
    if (!passwordEsValida(createForm.password, createForm.username, createForm.email)) {
      setErroresCampo({ password: 'La contraseña no cumple todos los requisitos.' })
      setErrorFormulario('Revisa los requisitos de la contraseña antes de continuar.')
      return
    }

    setGuardando(true)
    try {
      await usuariosApi.create({
        nombre: createForm.nombre.trim(),
        apellido: createForm.apellido.trim(),
        email: createForm.email.trim(),
        username: createForm.username.trim(),
        password: createForm.password,
        telefono: createForm.telefono.trim() || null,
        role_ids: createForm.role_ids,
        // Por omisión la cuenta queda utilizable de inmediato: la crea un
        // administrador y la contraseña provisional obliga a cambiarla al entrar.
        email_verificado: !createForm.exigir_verificacion,
        // Ausente = administrador de plataforma. Presente = usuario de esa empresa.
        ...(empresaAlta !== undefined ? { empresa_id: empresaAlta } : {}),
      })
      setShowCreate(false)
      setCreateForm(FORM_VACIO)
      setMensaje(
        esVistaGlobal
          ? 'Administrador de plataforma creado correctamente.'
          : 'Usuario creado correctamente.',
      )
      await cargar()
    } catch (cause) {
      registrarError(cause, 'No se pudo crear el usuario.')
    } finally {
      setGuardando(false)
    }
  }

  function empezarEdicion(usuario: User) {
    limpiarErrores()
    // El backend devuelve los roles por nombre; hay que traducirlos a identificadores.
    const idsRoles = roles
      .filter((rol) => usuario.roles?.includes(rol.name) || usuario.roles?.includes(rol.codigo))
      .map((rol) => rol.id)
    setEditando(usuario)
    setEditForm({
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      email: usuario.email,
      username: usuario.username,
      telefono: usuario.telefono ?? '',
      password: '',
      role_ids: idsRoles,
      // No aplica al editar: la verificación solo se decide en el alta.
      exigir_verificacion: false,
    })
  }

  async function actualizar(evento: FormEvent) {
    evento.preventDefault()
    if (editando === null) return
    limpiarErrores()
    if (editForm.role_ids.length === 0) {
      setErroresCampo({ role_ids: 'Selecciona al menos un rol.' })
      return
    }
    setGuardando(true)
    try {
      await usuariosApi.update(
        editando.id,
        {
          nombre: editForm.nombre.trim(),
          apellido: editForm.apellido.trim(),
          email: editForm.email.trim(),
          username: editForm.username.trim(),
          telefono: editForm.telefono.trim() || null,
          role_ids: editForm.role_ids,
        },
        editando.empresa_id ?? undefined,
      )
      setEditando(null)
      setMensaje('Usuario actualizado correctamente.')
      await cargar()
    } catch (cause) {
      registrarError(cause, 'No se pudo actualizar el usuario.')
    } finally {
      setGuardando(false)
    }
  }

  async function asignarClave(evento: FormEvent) {
    evento.preventDefault()
    if (cambiandoClave === null) return
    limpiarErrores()
    if (!passwordEsValida(nuevaClave, cambiandoClave.username, cambiandoClave.email)) {
      setErroresCampo({ new_password: 'La contraseña no cumple todos los requisitos.' })
      return
    }
    setGuardando(true)
    try {
      await usuariosApi.changePassword(
        cambiandoClave.id,
        { new_password: nuevaClave, must_change: exigirCambio },
        cambiandoClave.empresa_id ?? undefined,
      )
      setCambiandoClave(null)
      setNuevaClave('')
      setMensaje('Contraseña asignada. Se revocaron las sesiones activas del usuario.')
    } catch (cause) {
      registrarError(cause, 'No se pudo asignar la contraseña.')
    } finally {
      setGuardando(false)
    }
  }

  async function confirmarAccion() {
    if (accion === null) return
    setGuardando(true)
    setErrorFormulario(null)
    try {
      const { usuario, tipo } = accion
      const alcance = usuario.empresa_id ?? undefined
      if (tipo === 'activar') await usuariosApi.activate(usuario.id, alcance)
      if (tipo === 'desactivar') await usuariosApi.deactivate(usuario.id, alcance)
      if (tipo === 'eliminar') await usuariosApi.remove(usuario.id, alcance)
      if (tipo === 'restaurar') await usuariosApi.restore(usuario.id, alcance)
      if (tipo === 'desbloquear') await usuariosApi.unlock(usuario.id, alcance)
      setAccion(null)
      setMensaje(`${TITULO_ACCION[tipo]}: operación completada.`)
      await cargar()
    } catch (cause) {
      setErrorFormulario(cause instanceof Error ? cause.message : 'No se pudo completar la acción.')
    } finally {
      setGuardando(false)
    }
  }

  function alternarRol(lista: string[], id: string): string[] {
    return lista.includes(id) ? lista.filter((valor) => valor !== id) : [...lista, id]
  }

  const columnas: Column<User>[] = [
    {
      key: 'colaborador',
      header: esVistaGlobal ? 'Administrador' : 'Colaborador',
      render: (usuario) => (
        <>
          <strong>
            {usuario.nombre} {usuario.apellido}
          </strong>
          <small>
            @{usuario.username}
            {usuario.telefono != null && usuario.telefono !== '' ? ` · ${usuario.telefono}` : ''}
          </small>
        </>
      ),
    },
    { key: 'email', header: 'Correo', render: (usuario) => usuario.email },
    {
      key: 'ambito',
      header: 'Ámbito',
      render: (usuario) =>
        usuario.empresa_id == null ? <Badge tone="brand">Plataforma</Badge> : <Badge tone="neutral">Empresa</Badge>,
    },
    {
      key: 'roles',
      header: 'Roles',
      render: (usuario) =>
        usuario.roles !== undefined && usuario.roles.length > 0 ? (
          <div className="badge-list">
            {usuario.roles.map((rol) => (
              <Badge key={rol} tone="neutral">
                {rol}
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-muted">Sin roles</span>
        ),
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (usuario) => {
        if (usuario.is_deleted) return <Badge tone="danger">Eliminado</Badge>
        if (usuario.locked_until != null) return <Badge tone="warning">Bloqueado</Badge>
        if (!usuario.is_active) return <Badge tone="warning">Inactivo</Badge>
        if (!usuario.email_verified) return <Badge tone="info">Sin verificar</Badge>
        return <Badge tone="success">Activo</Badge>
      },
    },
    {
      key: 'acciones',
      header: 'Acciones',
      align: 'right',
      render: (usuario) => (
        <div className="row-actions">
          {usuario.is_deleted ? (
            <Can permisos={PERM_RESTAURAR}>
              <Button variant="secondary" size="sm" onClick={() => setAccion({ usuario, tipo: 'restaurar' })}>
                Restaurar
              </Button>
            </Can>
          ) : (
            <>
              <Can permisos={PERM_EDITAR}>
                <Button variant="secondary" size="sm" onClick={() => empezarEdicion(usuario)}>
                  Editar
                </Button>
              </Can>
              <Can permisos={PERM_PASSWORD}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    limpiarErrores()
                    setNuevaClave('')
                    setCambiandoClave(usuario)
                  }}
                >
                  Contraseña
                </Button>
              </Can>
              <Can permisos={PERM_EDITAR}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setAccion({ usuario, tipo: usuario.is_active ? 'desactivar' : 'activar' })
                  }
                >
                  {usuario.is_active ? 'Desactivar' : 'Activar'}
                </Button>
              </Can>
              {usuario.locked_until != null && (
                <Can permisos={PERM_DESBLOQUEAR}>
                  <Button variant="ghost" size="sm" onClick={() => setAccion({ usuario, tipo: 'desbloquear' })}>
                    Desbloquear
                  </Button>
                </Can>
              )}
              <Can permisos={PERM_ELIMINAR}>
                <Button
                  variant="danger-outline"
                  size="sm"
                  onClick={() => setAccion({ usuario, tipo: 'eliminar' })}
                >
                  Eliminar
                </Button>
              </Can>
            </>
          )}
        </div>
      ),
    },
  ]

  const sinRolesEnAmbito = roles.length === 0 && rolesError === null

  function camposComunes(
    valores: typeof FORM_VACIO,
    cambiar: (siguiente: typeof FORM_VACIO) => void,
  ) {
    return (
      <>
        <div className="form-grid">
          <Field label="Nombres" error={erroresCampo.nombre}>
            <input
              value={valores.nombre}
              onChange={(evento) => cambiar({ ...valores, nombre: evento.target.value })}
              minLength={2}
              maxLength={120}
              required
            />
          </Field>
          <Field label="Apellidos" error={erroresCampo.apellido}>
            <input
              value={valores.apellido}
              onChange={(evento) => cambiar({ ...valores, apellido: evento.target.value })}
              maxLength={120}
              required
            />
          </Field>
        </div>
        <div className="form-grid">
          <Field label="Correo electrónico" error={erroresCampo.email}>
            <input
              type="email"
              value={valores.email}
              onChange={(evento) => cambiar({ ...valores, email: evento.target.value })}
              required
            />
          </Field>
          <Field
            label="Nombre de usuario"
            hint="Mínimo 3 caracteres. Solo minúsculas, números, punto, guion y guion bajo."
            error={erroresCampo.username}
          >
            <input
              value={valores.username}
              onChange={(evento) =>
                cambiar({
                  ...valores,
                  username: evento.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''),
                })
              }
              minLength={3}
              maxLength={80}
              required
            />
          </Field>
        </div>
        <Field label="Teléfono" error={erroresCampo.telefono}>
          <input
            value={valores.telefono}
            onChange={(evento) => cambiar({ ...valores, telefono: evento.target.value })}
            maxLength={40}
          />
        </Field>
        <Field
          label="Roles"
          group
          hint={
            esVistaGlobal
              ? 'Roles globales de la plataforma. Obligatorio: sin rol el usuario no puede iniciar sesión.'
              : 'Roles de esta empresa. Obligatorio: sin rol el usuario no puede iniciar sesión.'
          }
          error={erroresCampo.role_ids}
        >
          {rolesError !== null ? (
            <Alert tone="error">{rolesError}</Alert>
          ) : sinRolesEnAmbito ? (
            <Alert tone="info">
              {esVistaGlobal
                ? 'No hay roles globales disponibles. Consulta la configuración de roles de la plataforma.'
                : 'No hay roles disponibles en esta empresa. Crea primero un rol en «Roles y permisos».'}
            </Alert>
          ) : (
            <div className="check-grid">
              {roles.map((rol) => (
                <label key={rol.id} className="check-label">
                  <input
                    type="checkbox"
                    checked={valores.role_ids.includes(rol.id)}
                    onChange={() =>
                      cambiar({ ...valores, role_ids: alternarRol(valores.role_ids, rol.id) })
                    }
                  />
                  {rol.name}
                </label>
              ))}
            </div>
          )}
        </Field>
      </>
    )
  }

  return (
    <section className="page-stack">
      <PageHeader
        eyebrow={esVistaGlobal ? 'Plataforma' : 'Administración'}
        title={esVistaGlobal ? 'Administradores globales' : 'Usuarios'}
        description={
          esVistaGlobal
            ? 'Cuentas con acceso a la administración de la plataforma.'
            : 'Colaboradores de la empresa activa, sus roles y sus credenciales.'
        }
        actions={
          <Can permisos={PERM_CREAR}>
            <Button
              onClick={() => {
                limpiarErrores()
                setCreateForm(FORM_VACIO)
                setShowCreate(true)
              }}
            >
              {esVistaGlobal ? 'Nuevo administrador' : 'Nuevo usuario'}
            </Button>
          </Can>
        }
      />

      {!can(...PERM_VER) && (
        <Alert tone="info" title="Permisos insuficientes">
          Tu rol no incluye el permiso para consultar usuarios. El listado puede aparecer vacío.
        </Alert>
      )}

      {mensaje !== null && <Alert tone="success">{mensaje}</Alert>}

      <Panel
        title="Directorio"
        count={`${total} ${esVistaGlobal
          ? (total === 1 ? 'administrador' : 'administradores')
          : (total === 1 ? 'usuario' : 'usuarios')}`}
      >
        <form
          className="filters"
          onSubmit={(evento) => {
            evento.preventDefault()
            setPage(1)
            setBusqueda(search)
          }}
        >
          <Field label="Buscar">
            <input
              value={search}
              onChange={(evento) => setSearch(evento.target.value)}
              placeholder="Nombre, usuario o correo"
            />
          </Field>
          <Field label="Estado">
            <select
              value={estadoFiltro}
              onChange={(evento) => {
                setPage(1)
                setEstadoFiltro(evento.target.value)
              }}
            >
              <option value="">Todos</option>
              <option value="true">Solo activos</option>
              <option value="false">Solo inactivos</option>
            </select>
          </Field>
          <label className="check-label">
            <input
              type="checkbox"
              checked={incluirEliminados}
              onChange={(evento) => {
                setPage(1)
                setIncluirEliminados(evento.target.checked)
              }}
            />
            Incluir eliminados
          </label>
          <div className="filters-actions">
            <Button type="submit" variant="secondary">
              Consultar
            </Button>
          </div>
        </form>

        <DataTable
          columns={columnas}
          rows={usuarios}
          rowKey={(usuario) => usuario.id}
          loading={loading}
          error={error}
          onRetry={() => void cargar()}
          emptyMessage={
            esVistaGlobal
              ? 'No hay administradores globales que coincidan con la búsqueda.'
              : 'No hay usuarios que coincidan con la búsqueda.'
          }
          caption={esVistaGlobal ? 'Administradores globales' : 'Usuarios de la empresa activa'}
        />

        {!loading && error === null && total > 0 && (
          <Pagination
            page={page}
            perPage={perPage}
            total={total}
            onPageChange={setPage}
            onPerPageChange={(valor) => {
              setPerPage(valor)
              setPage(1)
            }}
          />
        )}
      </Panel>

      {showCreate && (
        <Modal
          title={esVistaGlobal ? 'Nuevo administrador global' : 'Nuevo usuario'}
          size="lg"
          onClose={() => setShowCreate(false)}
        >
          <form className="form-stack" onSubmit={(evento) => void crear(evento)}>
            {camposComunes(createForm, setCreateForm)}

            <Field
              label="Contraseña provisional"
              hint="El usuario deberá cambiarla en su primer inicio de sesión."
              error={erroresCampo.password}
            >
              <input
                type="text"
                value={createForm.password}
                onChange={(evento) => setCreateForm({ ...createForm, password: evento.target.value })}
                minLength={12}
                maxLength={72}
                autoComplete="new-password"
                required
              />
            </Field>
            <div className="form-actions-start">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCreateForm({ ...createForm, password: generarPassword() })}
              >
                Generar contraseña segura
              </Button>
            </div>
            <ul className="checklist">
              {requisitos.map((requisito) => (
                <li key={requisito.id} className={requisito.cumple ? 'cumple' : 'pendiente'}>
                  {requisito.texto}
                </li>
              ))}
            </ul>

            <label className="check-label">
              <input
                type="checkbox"
                checked={createForm.exigir_verificacion}
                onChange={(evento) =>
                  setCreateForm({ ...createForm, exigir_verificacion: evento.target.checked })
                }
              />
              Exigir que verifique su correo antes de poder entrar
            </label>
            {createForm.exigir_verificacion && (
              <Alert tone="info">
                La cuenta no podrá iniciar sesión hasta que el titular abra el enlace de
                verificación que se le envía por correo. Si el envío de correo no está
                configurado, la cuenta quedará inutilizable.
              </Alert>
            )}

            {errorFormulario !== null && <Alert tone="error">{errorFormulario}</Alert>}

            <div className="form-actions">
              <Button variant="secondary" onClick={() => setShowCreate(false)} disabled={guardando}>
                Cancelar
              </Button>
              <Button type="submit" loading={guardando} disabled={sinRolesEnAmbito}>
                {esVistaGlobal ? 'Crear administrador' : 'Crear usuario'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {editando !== null && (
        <Modal
          title={`Editar ${editando.nombre} ${editando.apellido}`}
          size="lg"
          onClose={() => setEditando(null)}
        >
          <form className="form-stack" onSubmit={(evento) => void actualizar(evento)}>
            {camposComunes(editForm, setEditForm)}
            {errorFormulario !== null && <Alert tone="error">{errorFormulario}</Alert>}
            <div className="form-actions">
              <Button variant="secondary" onClick={() => setEditando(null)} disabled={guardando}>
                Cancelar
              </Button>
              <Button type="submit" loading={guardando}>
                Guardar cambios
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {cambiandoClave !== null && (
        <Modal
          title={`Contraseña de ${cambiandoClave.nombre} ${cambiandoClave.apellido}`}
          onClose={() => setCambiandoClave(null)}
        >
          <form className="form-stack" onSubmit={(evento) => void asignarClave(evento)}>
            <p className="text-muted">
              Al guardar se revocan todas las sesiones activas de este usuario.
            </p>
            <Field label="Nueva contraseña" error={erroresCampo.new_password}>
              <input
                type="text"
                value={nuevaClave}
                onChange={(evento) => setNuevaClave(evento.target.value)}
                minLength={12}
                maxLength={72}
                autoComplete="new-password"
                required
              />
            </Field>
            <div className="form-actions-start">
              <Button variant="secondary" size="sm" onClick={() => setNuevaClave(generarPassword())}>
                Generar contraseña segura
              </Button>
            </div>
            <ul className="checklist">
              {requisitosClave.map((requisito) => (
                <li key={requisito.id} className={requisito.cumple ? 'cumple' : 'pendiente'}>
                  {requisito.texto}
                </li>
              ))}
            </ul>
            <label className="check-label">
              <input
                type="checkbox"
                checked={exigirCambio}
                onChange={(evento) => setExigirCambio(evento.target.checked)}
              />
              Exigir cambio en el próximo inicio de sesión
            </label>
            {errorFormulario !== null && <Alert tone="error">{errorFormulario}</Alert>}
            <div className="form-actions">
              <Button variant="secondary" onClick={() => setCambiandoClave(null)} disabled={guardando}>
                Cancelar
              </Button>
              <Button type="submit" loading={guardando}>
                Asignar contraseña
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {accion !== null && (
        <ConfirmDialog
          title={TITULO_ACCION[accion.tipo]}
          message={
            <>
              <p>
                <strong>
                  {accion.usuario.nombre} {accion.usuario.apellido}
                </strong>{' '}
                (@{accion.usuario.username})
              </p>
              <p>{DETALLE_ACCION[accion.tipo]}</p>
            </>
          }
          confirmLabel={TITULO_ACCION[accion.tipo].split(' ')[0]}
          tone={accion.tipo === 'eliminar' || accion.tipo === 'desactivar' ? 'danger' : 'primary'}
          loading={guardando}
          error={errorFormulario}
          onConfirm={() => void confirmarAccion()}
          onCancel={() => {
            setAccion(null)
            setErrorFormulario(null)
          }}
        />
      )}
    </section>
  )
}
