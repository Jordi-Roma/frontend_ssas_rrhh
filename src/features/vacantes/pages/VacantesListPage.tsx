import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Can } from '../../../app/access/AccessProvider'
import { useCompanyScope } from '../../../app/context/CompanyScopeContext'
import { ApiError } from '../../../shared/api/httpClient'
import {
  Alert,
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  EmptyState,
  EstadoBadge,
  Field,
  PageHeader,
  Pagination,
  Panel,
} from '../../../shared/components'
import type { Column } from '../../../shared/components'
import {
  cerrarVacante,
  getCandidatosInternos,
  eliminarVacante,
  getVacantes,
  pausarVacante,
  publicarVacante,
  reanudarVacante,
  type EstadoVacante,
  type PaginatedVacantes,
  type VacanteListItem,
  type SugerenciasInternas,
} from '../api/vacantesApi'

/** Acciones del ciclo de vida de una vacante que exigen confirmación. */
type AccionVacante = 'publicar' | 'pausar' | 'reanudar' | 'cerrar' | 'eliminar'

type AccionPendiente = { vacante: VacanteListItem; tipo: AccionVacante }

const PERM_CREAR = ['vacantes:crear', 'platform:vacantes:gestionar']
const PERM_EDITAR = ['vacantes:editar', 'platform:vacantes:gestionar']
const PERM_PUBLICAR = ['vacantes:publicar', 'platform:vacantes:gestionar']
const PERM_ELIMINAR = ['vacantes:eliminar', 'platform:vacantes:gestionar']
const PERM_TABLERO = ['postulaciones:ver', 'platform:postulaciones:ver']

const TITULO_ACCION: Record<AccionVacante, string> = {
  publicar: 'Publicar vacante',
  pausar: 'Pausar vacante',
  reanudar: 'Reanudar vacante',
  cerrar: 'Cerrar vacante',
  eliminar: 'Eliminar vacante',
}

const DETALLE_ACCION: Record<AccionVacante, string> = {
  publicar: 'Pasará a estar activa y visible para los postulantes en el portal público.',
  pausar: 'Dejará de aparecer temporalmente en el portal público. Podrás reanudarla cuando quieras.',
  reanudar: 'Volverá a estar visible para los postulantes en el portal público.',
  cerrar: 'Se cierra la recepción de postulaciones para esta vacante.',
  eliminar: 'La vacante deja de existir en el sistema. Esta acción no se puede deshacer.',
}

const ETIQUETA_CONFIRMAR: Record<AccionVacante, string> = {
  publicar: 'Publicar',
  pausar: 'Pausar',
  reanudar: 'Reanudar',
  cerrar: 'Cerrar',
  eliminar: 'Eliminar',
}

const MENSAJE_EXITO: Record<AccionVacante, string> = {
  publicar: 'Vacante publicada. Ya está visible para recibir postulaciones.',
  pausar: 'Vacante pausada. Ya no aparece en el portal público.',
  reanudar: 'Vacante reanudada. Vuelve a estar visible en el portal público.',
  cerrar: 'Vacante cerrada correctamente.',
  eliminar: 'Vacante eliminada correctamente.',
}

/** Cerrar y eliminar no se pueden deshacer; pausar sí, con «Reanudar». */
const ACCION_IRREVERSIBLE: AccionVacante[] = ['cerrar', 'eliminar']

const SIN_DATOS: PaginatedVacantes = {
  items: [],
  departamentos: [],
  total: 0,
  all_total: 0,
  counts: { BORRADOR: 0, PUBLICADA: 0, PAUSADA: 0, CERRADA: 0, CANCELADA: 0 },
  page: 1,
  per_page: 10,
  total_pages: 1,
}

/** Las tarjetas de métrica cuentan sobre todas las vacantes del alcance, nunca
 *  sobre la página visible ya filtrada: `all_total` y `counts` llegan sin filtrar. */
const METRICAS: { estado: EstadoVacante | 'TODAS'; etiqueta: string }[] = [
  { estado: 'TODAS', etiqueta: 'Total de vacantes' },
  { estado: 'PUBLICADA', etiqueta: 'Publicadas' },
  { estado: 'BORRADOR', etiqueta: 'Borradores' },
  { estado: 'PAUSADA', etiqueta: 'Pausadas' },
  { estado: 'CERRADA', etiqueta: 'Cerradas' },
]

export function VacantesListPage() {
  const navigate = useNavigate()
  const { company } = useCompanyScope()

  const [busqueda, setBusqueda] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoVacante | 'TODAS'>('TODAS')
  const [departamentoFiltro, setDepartamentoFiltro] = useState<string>('TODOS')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)

  const [data, setData] = useState<PaginatedVacantes>(SIN_DATOS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mensaje, setMensaje] = useState<string | null>(null)

  const [accion, setAccion] = useState<AccionPendiente | null>(null)
  const [ejecutando, setEjecutando] = useState(false)
  const [errorAccion, setErrorAccion] = useState<string | null>(null)
  const [errorPublicacion, setErrorPublicacion] = useState<string | null>(null)
  const [internalVacancy, setInternalVacancy] = useState<VacanteListItem | null>(null)
  const [suggestions, setSuggestions] = useState<SugerenciasInternas | null>(null)
  const [suggestionError, setSuggestionError] = useState<string | null>(null)
  const [suggestionLoading, setSuggestionLoading] = useState(false)

  async function showInternal(vacante: VacanteListItem) {
    setInternalVacancy(vacante); setSuggestions(null); setSuggestionError(null); setSuggestionLoading(true)
    try { setSuggestions(await getCandidatosInternos(vacante.id, company?.id)) }
    catch (cause) { setSuggestionError(cause instanceof Error ? cause.message : 'No se pudieron consultar los perfiles.') }
    finally { setSuggestionLoading(false) }
  }

  const cargar = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const resultado = await getVacantes({
        busqueda: busqueda.trim() || undefined,
        estado: estadoFiltro,
        departamento_id: departamentoFiltro,
        page,
        per_page: perPage,
        empresa_id: company?.id,
      })
      setData(resultado)
    } catch (cause) {
      // Un fallo nunca se muestra como «no hay vacantes»: son cosas distintas.
      setData(SIN_DATOS)
      setError(cause instanceof Error ? cause.message : 'No se pudieron cargar las vacantes.')
    } finally {
      setLoading(false)
    }
  }, [busqueda, company?.id, departamentoFiltro, estadoFiltro, page, perPage])

  useEffect(() => {
    void cargar()
  }, [cargar])

  function limpiarFiltros() {
    setBusqueda('')
    setEstadoFiltro('TODAS')
    setDepartamentoFiltro('TODOS')
    setPage(1)
  }

  function abrirAccion(vacante: VacanteListItem, tipo: AccionVacante) {
    setErrorAccion(null)
    setErrorPublicacion(null)
    setAccion({ vacante, tipo })
  }

  function cerrarAccion() {
    setAccion(null)
    setErrorAccion(null)
    setErrorPublicacion(null)
  }

  async function confirmarAccion() {
    if (accion === null) return
    setEjecutando(true)
    setErrorAccion(null)
    setErrorPublicacion(null)
    try {
      const { vacante, tipo } = accion
      const alcance = company?.id
      if (tipo === 'publicar') await publicarVacante(vacante.id, alcance)
      if (tipo === 'pausar') await pausarVacante(vacante.id, alcance)
      if (tipo === 'reanudar') await reanudarVacante(vacante.id, alcance)
      if (tipo === 'cerrar') await cerrarVacante(vacante.id, alcance)
      if (tipo === 'eliminar') await eliminarVacante(vacante.id, alcance)
      setAccion(null)
      setMensaje(MENSAJE_EXITO[tipo])
      window.setTimeout(() => setMensaje(null), 5000)
      await cargar()
    } catch (cause) {
      // El 422 se explica aparte: la vacante no cumple los requisitos y se
      // resuelve completando sus datos, no reintentando la misma acción.
      if (cause instanceof ApiError && cause.status === 422) {
        setErrorPublicacion(
          cause.message || 'La vacante no cumple los requisitos para completar esta acción.',
        )
      } else {
        setErrorAccion(cause instanceof Error ? cause.message : 'No se pudo completar la acción.')
      }
    } finally {
      setEjecutando(false)
    }
  }

  function salario(vacante: VacanteListItem) {
    if (!vacante.mostrar_salario || (vacante.salario_min == null && vacante.salario_max == null)) {
      return <span className="text-muted">No publicado</span>
    }
    if (vacante.salario_min != null && vacante.salario_max != null) {
      return `Bs. ${vacante.salario_min.toLocaleString('es-BO')} – ${vacante.salario_max.toLocaleString('es-BO')}`
    }
    if (vacante.salario_min != null) return `Desde Bs. ${vacante.salario_min.toLocaleString('es-BO')}`
    return `Hasta Bs. ${vacante.salario_max?.toLocaleString('es-BO')}`
  }

  const columnas: Column<VacanteListItem>[] = [
    {
      key: 'vacante',
      header: 'Vacante y cargo',
      render: (vacante) => (
        <>
          <strong>{vacante.titulo}</strong>
          <small>{vacante.cargo_nombre}</small>
        </>
      ),
    },
    {
      key: 'departamento',
      header: 'Departamento',
      render: (vacante) => <Badge tone="neutral">{vacante.departamento_nombre}</Badge>,
    },
    {
      key: 'modalidad',
      header: 'Modalidad y ciudad',
      render: (vacante) => (
        <>
          <span className="chip">{vacante.modalidad}</span>
          <small>{vacante.ubicacion || 'Sin especificar'}</small>
        </>
      ),
    },
    { key: 'salario', header: 'Rango salarial', render: (vacante) => salario(vacante) },
    {
      key: 'cierre',
      header: 'Cierre y puestos',
      render: (vacante) => (
        <>
          <span>{vacante.fecha_cierre ? vacante.fecha_cierre.slice(0, 10) : '—'}</span>
          <small>
            {vacante.cantidad_vacantes} {vacante.cantidad_vacantes === 1 ? 'puesto' : 'puestos'}
          </small>
        </>
      ),
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (vacante) => <EstadoBadge estado={vacante.estado} />,
    },
    {
      key: 'acciones',
      header: 'Acciones',
      align: 'right',
      render: (vacante) => (
        <div className="row-actions">
          <Can permisos={PERM_TABLERO}>
            <Link className="button button-ghost button-sm" to={`/vacantes/${vacante.id}/tablero`}>
              Tablero
              {vacante.postulantes_count != null ? ` (${vacante.postulantes_count})` : ''}
            </Link>
          </Can>
          <Can permisos={['empleados:ver', 'platform:vacantes:gestionar']}>
            <Button variant="secondary" size="sm" onClick={() => void showInternal(vacante)}>Talento interno</Button>
          </Can>

          {(vacante.estado === 'BORRADOR' || vacante.estado === 'PAUSADA') && (
            <Can permisos={PERM_EDITAR}>
              <Link
                className="button button-secondary button-sm"
                to={`/vacantes/${vacante.id}/editar`}
              >
                Editar
              </Link>
            </Can>
          )}

          {vacante.estado === 'BORRADOR' && (
            <Can permisos={PERM_PUBLICAR}>
              <Button size="sm" onClick={() => abrirAccion(vacante, 'publicar')}>
                Publicar
              </Button>
            </Can>
          )}

          {vacante.estado === 'PUBLICADA' && (
            <Can permisos={PERM_PUBLICAR}>
              <Button variant="secondary" size="sm" onClick={() => abrirAccion(vacante, 'pausar')}>
                Pausar
              </Button>
            </Can>
          )}

          {vacante.estado === 'PAUSADA' && (
            <Can permisos={PERM_PUBLICAR}>
              <Button size="sm" onClick={() => abrirAccion(vacante, 'reanudar')}>
                Reanudar
              </Button>
            </Can>
          )}

          {(vacante.estado === 'PUBLICADA' || vacante.estado === 'PAUSADA') && (
            <Can permisos={PERM_PUBLICAR}>
              <Button
                variant="danger-outline"
                size="sm"
                onClick={() => abrirAccion(vacante, 'cerrar')}
              >
                Cerrar
              </Button>
            </Can>
          )}

          {(vacante.estado === 'BORRADOR' || vacante.estado === 'CANCELADA') && (
            <Can permisos={PERM_ELIMINAR}>
              <Button
                variant="danger-outline"
                size="sm"
                onClick={() => abrirAccion(vacante, 'eliminar')}
              >
                Eliminar
              </Button>
            </Can>
          )}
        </div>
      ),
    },
  ]

  const hayFiltros =
    busqueda.trim() !== '' || estadoFiltro !== 'TODAS' || departamentoFiltro !== 'TODOS'
  const sinVacantes = !loading && error === null && data.all_total === 0

  return (
    <section className="page-stack">
      <PageHeader
        eyebrow="Reclutamiento y selección"
        title="Vacantes"
        description="Publicación, filtros por departamento y estado, y seguimiento de postulaciones."
        actions={
          <Can permisos={PERM_CREAR}>
            <Link className="button button-primary" to="/vacantes/nueva">
              Nueva vacante
            </Link>
          </Can>
        }
      />

      {mensaje !== null && <Alert tone="success">{mensaje}</Alert>}

      {internalVacancy && <Panel title={`Talento interno · ${internalVacancy.titulo}`} eyebrow="Coincidencia de habilidades">
        <p>Comparación orientativa por habilidades registradas y pesos de la vacante. El nivel requerido se revisa por separado antes de contactar a una persona.</p>
        <Button variant="secondary" size="sm" onClick={() => setInternalVacancy(null)}>Cerrar</Button>
        {suggestionLoading && <p role="status">Buscando perfiles…</p>}
        {suggestionError && <Alert tone="error">{suggestionError}</Alert>}
        {suggestions && !suggestions.evaluables && <Alert tone="info">Agrega habilidades requeridas a la vacante para comparar perfiles.</Alert>}
        {suggestions?.evaluables && suggestions.candidatos.length === 0 && <Alert tone="info">Todavía no hay empleados activos para comparar.</Alert>}
        {suggestions?.candidatos.map(candidate => <div className="internal-candidate" key={candidate.empleado_id}>
          <div><strong>{candidate.nombre}</strong><small> · {candidate.codigo}</small></div>
          <strong>{candidate.afinidad}%</strong>
          <p>Coinciden: {candidate.coinciden.join(', ') || 'ninguna'}</p>
          <p>Faltan: {candidate.faltan.join(', ') || 'ninguna'}{candidate.obligatorias_pendientes.length > 0 ? ` · Obligatorias: ${candidate.obligatorias_pendientes.join(', ')}` : ''}</p>
        </div>)}
      </Panel>}

      <div className="card-grid">
        {METRICAS.map((metrica) => (
          <button
            key={metrica.estado}
            className="metric-card"
            type="button"
            aria-pressed={estadoFiltro === metrica.estado}
            onClick={() => {
              setEstadoFiltro(metrica.estado)
              setPage(1)
            }}
          >
            <span className="metric-label">{metrica.etiqueta}</span>
            <span className="metric-value">
              {metrica.estado === 'TODAS' ? data.all_total : data.counts[metrica.estado]}
            </span>
          </button>
        ))}
      </div>

      <Panel title="Listado" count={`${data.total} vacante${data.total === 1 ? '' : 's'}`}>
        <form className="filters" onSubmit={(evento) => evento.preventDefault()}>
          <Field label="Buscar vacante">
            <input
              value={busqueda}
              onChange={(evento) => {
                setBusqueda(evento.target.value)
                setPage(1)
              }}
              placeholder="Título, cargo, ubicación o descripción"
            />
          </Field>
          <Field label="Departamento">
            <select
              value={departamentoFiltro}
              onChange={(evento) => {
                setDepartamentoFiltro(evento.target.value)
                setPage(1)
              }}
            >
              <option value="TODOS">Todos los departamentos</option>
              {data.departamentos.map((departamento) => (
                <option key={departamento.id} value={departamento.id}>
                  {departamento.nombre}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Estado">
            <select
              value={estadoFiltro}
              onChange={(evento) => {
                setEstadoFiltro(evento.target.value as EstadoVacante | 'TODAS')
                setPage(1)
              }}
            >
              <option value="TODAS">Todos los estados</option>
              <option value="BORRADOR">Borrador</option>
              <option value="PUBLICADA">Publicada</option>
              <option value="PAUSADA">Pausada</option>
              <option value="CERRADA">Cerrada</option>
            </select>
          </Field>
          <div className="filters-actions">
            <Button variant="secondary" onClick={limpiarFiltros} disabled={!hayFiltros}>
              Limpiar filtros
            </Button>
          </div>
        </form>

        {sinVacantes ? (
          <EmptyState
            title="Todavía no hay vacantes"
            message="Registra la primera vacante para empezar a recibir postulaciones."
            action={
              <Can permisos={PERM_CREAR}>
                <Link className="button button-primary" to="/vacantes/nueva">
                  Crear la primera vacante
                </Link>
              </Can>
            }
          />
        ) : (
          <>
            <DataTable
              columns={columnas}
              rows={data.items}
              rowKey={(vacante) => vacante.id}
              loading={loading}
              error={error}
              onRetry={() => void cargar()}
              emptyMessage="No hay vacantes que coincidan con los filtros aplicados."
              caption="Vacantes del alcance actual"
            />

            {!loading && error === null && data.total > 0 && (
              <Pagination
                page={data.page}
                perPage={data.per_page}
                total={data.total}
                onPageChange={setPage}
                onPerPageChange={(valor) => {
                  setPerPage(valor)
                  setPage(1)
                }}
              />
            )}
          </>
        )}
      </Panel>

      {accion !== null && (
        <ConfirmDialog
          title={TITULO_ACCION[accion.tipo]}
          message={
            <>
              <p>
                <strong>{accion.vacante.titulo}</strong>
              </p>
              <p>{DETALLE_ACCION[accion.tipo]}</p>
              <div className="info-list">
                <div className="info-row">
                  <span className="info-label">Cargo</span>
                  <span className="info-value">{accion.vacante.cargo_nombre}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Departamento</span>
                  <span className="info-value">{accion.vacante.departamento_nombre}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Modalidad</span>
                  <span className="info-value">
                    {accion.vacante.modalidad}
                    {accion.vacante.ubicacion ? ` · ${accion.vacante.ubicacion}` : ''}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">Puestos</span>
                  <span className="info-value">{accion.vacante.cantidad_vacantes}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Fecha de cierre</span>
                  <span className="info-value">
                    {accion.vacante.fecha_cierre ? accion.vacante.fecha_cierre.slice(0, 10) : '—'}
                  </span>
                </div>
              </div>
              {errorPublicacion !== null && (
                <Alert tone="error" title="La vacante no cumple los requisitos">
                  <span>{errorPublicacion}</span>
                  <Can permisos={PERM_EDITAR}>
                    <span>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          const id = accion.vacante.id
                          cerrarAccion()
                          navigate(`/vacantes/${id}/editar`)
                        }}
                      >
                        Ir a editar la vacante
                      </Button>
                    </span>
                  </Can>
                </Alert>
              )}
            </>
          }
          confirmLabel={ETIQUETA_CONFIRMAR[accion.tipo]}
          tone={ACCION_IRREVERSIBLE.includes(accion.tipo) ? 'danger' : 'primary'}
          loading={ejecutando}
          error={errorAccion}
          onConfirm={() => void confirmarAccion()}
          onCancel={cerrarAccion}
        />
      )}
    </section>
  )
}
