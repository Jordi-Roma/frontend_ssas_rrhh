import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Can, useAccess } from '../../../app/access/AccessProvider'
import { useCompanyScope } from '../../../app/context/CompanyScopeContext'
import { Alert, Button, EmptyState, LoadingBlock, PageHeader } from '../../../shared/components'
import { getVacante, type Vacante } from '../../vacantes/api/vacantesApi'
import {
  getEtapas,
  getPostulaciones,
  type Etapa,
  type PostulanteDetalle,
} from '../api/tableroApi'
import { TableroKanban } from '../components/TableroKanban'
import { PERM_VACANTES_EDITAR, PERM_VER } from '../utils/tableroUi'

export function TableroPage() {
  const { selectedCompanyId } = useCompanyScope()
  const { id } = useParams()
  return <Tablero key={`${selectedCompanyId}:${id}`} />
}
function Tablero() {
  const { id } = useParams()
  const { company } = useCompanyScope()
  const { can } = useAccess()
  const [vacante, setVacante] = useState<Vacante | null>(null)
  const [etapas, setEtapas] = useState<Etapa[]>([])
  const [postulaciones, setPostulaciones] = useState<PostulanteDetalle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [etapasCargadas, postulacionesCargadas, vacanteSeleccionada] = await Promise.all([
        getEtapas(company?.id),
        getPostulaciones(id, company?.id),
        id ? getVacante(id, company?.id) : Promise.resolve(null),
      ])
      setEtapas([...etapasCargadas].sort((a, b) => a.orden - b.orden))
      setVacante(vacanteSeleccionada)
      setPostulaciones(
        postulacionesCargadas.map((postulacion) => ({
          ...postulacion,
          vacante_titulo: vacanteSeleccionada?.titulo ?? '',
        })),
      )
    } catch (cause) {
      // Un fallo de carga no se muestra como «tablero vacío»: son cosas distintas.
      setEtapas([])
      setPostulaciones([])
      setError(cause instanceof Error ? cause.message : 'No se pudo cargar el tablero.')
    } finally {
      setLoading(false)
    }
  }, [company?.id, id])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const totalPostulantes = postulaciones.length
  const descripcion =
    vacante !== null
      ? `${vacante.cantidad_vacantes} ${vacante.cantidad_vacantes === 1 ? 'puesto' : 'puestos'} · Modalidad ${vacante.modalidad} · ${totalPostulantes} ${totalPostulantes === 1 ? 'postulante' : 'postulantes'}`
      : 'Candidatos organizados según las etapas de reclutamiento configuradas.'

  return (
    <section className="page-stack">
      <PageHeader
        eyebrow="Reclutamiento y selección"
        title={vacante !== null ? `Tablero: ${vacante.titulo}` : 'Tablero de selección'}
        description={descripcion}
        actions={
          <>
            {id && <Link className="button button-secondary" to={`/vacantes/${id}/seleccion`}>Ranking y comparación</Link>}
            <Link className="button button-ghost" to="/vacantes">
              Volver a vacantes
            </Link>
            {vacante !== null && vacante.estado === 'BORRADOR' && (
              <Can permisos={PERM_VACANTES_EDITAR}>
                <Link className="button button-secondary" to={`/vacantes/${vacante.id}/editar`}>
                  Editar vacante
                </Link>
              </Can>
            )}
          </>
        }
      />

      {!can(...PERM_VER) && (
        <Alert tone="info" title="Permisos insuficientes">
          Tu rol no incluye el permiso para consultar postulaciones. El tablero puede aparecer
          vacío.
        </Alert>
      )}

      {error !== null && (
        <>
          <Alert tone="error">{error}</Alert>
          <div className="form-actions-start">
            <Button variant="secondary" onClick={() => void cargar()}>
              Reintentar
            </Button>
          </div>
        </>
      )}

      {loading && etapas.length === 0 ? (
        <LoadingBlock message="Cargando postulaciones…" />
      ) : error !== null ? null : etapas.length === 0 ? (
        <EmptyState
          title="Sin etapas de reclutamiento"
          message="No hay etapas configuradas para esta empresa. Configura las etapas antes de usar el tablero."
        />
      ) : (
        <TableroKanban
          etapas={etapas}
          postulaciones={postulaciones}
          empresaId={company?.id}
          onChanged={cargar}
        />
      )}
    </section>
  )
}
