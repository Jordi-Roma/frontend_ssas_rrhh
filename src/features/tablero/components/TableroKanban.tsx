import { Fragment, useState } from 'react'
import { Can, useAccess } from '../../../app/access/AccessProvider'
import { Alert, Button, EstadoBadge } from '../../../shared/components'
import { moverPostulacion, type Etapa, type PostulanteDetalle } from '../api/tableroApi'
import { estadoCanonico, formatFecha, PERM_GESTIONAR } from '../utils/tableroUi'
import { PostulanteDetalleModal } from './PostulanteDetalleModal'
import '../tablero-ia.css'

type Props = {
  etapas: Etapa[]
  postulaciones: PostulanteDetalle[]
  empresaId?: string
  onChanged: () => Promise<void>
}

export function TableroKanban({ etapas, postulaciones, empresaId, onChanged }: Props) {
  const { can } = useAccess()
  const puedeGestionar = can(...PERM_GESTIONAR)
  const [arrastrandoId, setArrastrandoId] = useState<string | null>(null)
  const [columnaActiva, setColumnaActiva] = useState<string | null>(null)
  const [seleccionado, setSeleccionado] = useState<PostulanteDetalle | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function mover(postulacionId: string, etapaId: string) {
    setError(null)
    try {
      await moverPostulacion(postulacionId, etapaId, empresaId)
      await onChanged()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo cambiar la etapa.')
    }
  }

  return (
    <>
      {error !== null && <Alert tone="error">{error}</Alert>}

      <div className="board">
        {etapas.map((etapa) => {
          const tarjetas = postulaciones.filter((postulacion) => postulacion.etapa_id === etapa.id)
          return (
            <section
              key={etapa.id}
              className="board-column"
              data-recibiendo={columnaActiva === etapa.id ? 'true' : undefined}
              onDragOver={(evento) => {
                if (!puedeGestionar) return
                evento.preventDefault()
                setColumnaActiva(etapa.id)
              }}
              onDragLeave={(evento) => {
                const destino = evento.relatedTarget
                if (destino instanceof Node && evento.currentTarget.contains(destino)) return
                setColumnaActiva(null)
              }}
              onDrop={(evento) => {
                evento.preventDefault()
                const postulacionId = evento.dataTransfer.getData('text/plain') || arrastrandoId
                setColumnaActiva(null)
                setArrastrandoId(null)
                if (!puedeGestionar || postulacionId === null || postulacionId === '') return
                const soltada = postulaciones.find(
                  (postulacion) => postulacion.id === postulacionId,
                )
                if (soltada !== undefined && soltada.etapa_id === etapa.id) return
                void mover(postulacionId, etapa.id)
              }}
            >
              <div className="board-column-header">
                <h3>{etapa.nombre}</h3>
                <span className="board-column-count">
                  {tarjetas.length} {tarjetas.length === 1 ? 'candidato' : 'candidatos'}
                </span>
              </div>

              {tarjetas.length === 0 ? (
                <p className="board-empty">Sin candidatos en esta etapa.</p>
              ) : (
                <div className="board-cards">
                  {tarjetas.map((tarjeta) => (
                    <Fragment key={tarjeta.id}>
                      <button
                        type="button"
                        className="board-card"
                        draggable={puedeGestionar}
                        data-arrastrando={arrastrandoId === tarjeta.id ? 'true' : undefined}
                        onDragStart={(evento) => {
                          setArrastrandoId(tarjeta.id)
                          evento.dataTransfer.setData('text/plain', tarjeta.id)
                        }}
                        onDragEnd={() => {
                          setArrastrandoId(null)
                          setColumnaActiva(null)
                        }}
                        onClick={() => setSeleccionado(tarjeta)}
                      >
                        <span className="board-card-top">
                          <strong>{tarjeta.nombre_postulante}</strong>
                          {tarjeta.puntaje_ia != null && (
                            <span className="ia-badge">{Math.round(tarjeta.puntaje_ia)}%</span>
                          )}
                          <EstadoBadge estado={estadoCanonico(tarjeta.estado)} />
                        </span>
                        <span className="board-card-meta">
                          <span>{formatFecha(tarjeta.fecha_postulacion)}</span>
                          {tarjeta.ciudad !== '' && <span>{tarjeta.ciudad}</span>}
                          <span>
                            {tarjeta.puntaje_manual == null
                              ? 'Sin puntaje'
                              : `Puntaje ${tarjeta.puntaje_manual}/100`}
                          </span>
                        </span>
                      </button>

                      <Can permisos={PERM_GESTIONAR}>
                        <div
                          className="board-card-actions"
                          role="group"
                          aria-label={`Cambiar de etapa a ${tarjeta.nombre_postulante}`}
                        >
                          {etapas
                            .filter((destino) => destino.id !== etapa.id)
                            .map((destino) => (
                              <Button
                                key={destino.id}
                                variant="ghost"
                                size="sm"
                                onClick={() => void mover(tarjeta.id, destino.id)}
                              >
                                Mover a {destino.nombre}
                              </Button>
                            ))}
                        </div>
                      </Can>
                    </Fragment>
                  ))}
                </div>
              )}
            </section>
          )
        })}
      </div>

      {seleccionado !== null && (
        <PostulanteDetalleModal
          postulante={seleccionado}
          etapas={etapas}
          empresaId={empresaId}
          onClose={() => setSeleccionado(null)}
          onSelectionChanged={() => void onChanged()}
          onUpdated={async () => {
            setSeleccionado(null)
            await onChanged()
          }}
        />
      )}
    </>
  )
}
