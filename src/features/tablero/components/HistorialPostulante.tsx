import { useEffect, useState } from 'react'
import { Alert, LoadingBlock } from '../../../shared/components'
import { formatFechaHora } from '../utils/tableroUi'
import { getHistorialPostulante, type EventoHistorial } from '../api/tableroApi'

type Props = {
  postulacionId: string
  empresaId?: string
}

export function HistorialPostulante({ postulacionId, empresaId }: Props) {
  const [eventos, setEventos] = useState<EventoHistorial[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let activo = true
    setLoading(true)
    setError(null)
    getHistorialPostulante(postulacionId, empresaId)
      .then((items) => {
        if (activo) setEventos(items)
      })
      .catch((cause: unknown) => {
        if (!activo) return
        setEventos([])
        setError(cause instanceof Error ? cause.message : 'No se pudo cargar el historial.')
      })
      .finally(() => {
        if (activo) setLoading(false)
      })
    return () => {
      activo = false
    }
  }, [empresaId, postulacionId])

  return (
    <div>
      <h3>Historial de selección</h3>
      {error !== null && <Alert tone="error">{error}</Alert>}
      {loading ? (
        <LoadingBlock message="Cargando historial…" />
      ) : error !== null ? null : eventos.length === 0 ? (
        <p className="board-empty">Todavía no hay eventos registrados.</p>
      ) : (
        <ol className="timeline">
          {eventos.map((evento) => (
            <li key={evento.id} className="timeline-item">
              <div className="timeline-header">
                <strong>{evento.tipo}</strong>
                <span>{formatFechaHora(evento.fecha)}</span>
              </div>
              <p className="timeline-text">
                Responsable: {evento.responsable || '—'}
                <br />
                Resultado:{' '}
                {evento.puntaje == null ? 'Sin puntaje' : `${evento.puntaje}/100`}
                {evento.recomendacion ? ` · ${evento.recomendacion}` : ''}
              </p>
              {evento.observaciones !== '' && (
                <p className="timeline-text">{evento.observaciones}</p>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
