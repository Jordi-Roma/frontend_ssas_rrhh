import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Can } from '../../../app/access/AccessProvider'
import {
  Alert,
  Button,
  EstadoBadge,
  Field,
  LoadingBlock,
  Modal,
} from '../../../shared/components'
import {
  actualizarPuntajePostulante,
  agregarNotaPostulante,
  descargarCV,
  getNotasPostulante,
  type Etapa,
  type NotaPostulante,
  type PostulanteDetalle,
} from '../api/tableroApi'
import { estadoCanonico, formatFechaHora, PERM_GESTIONAR } from '../utils/tableroUi'
import { RechazarPostulanteModal } from './RechazarPostulanteModal'
import { ContratarPostulanteModal } from './ContratarPostulanteModal'
import { HistorialPostulante } from './HistorialPostulante'
import { SeleccionCandidato } from '../../seleccion/components/SeleccionCandidato'
import { BancoTalentoAction } from '../../seleccion/components/BancoTalentoAction'
import '../tablero-ia.css'

type Props = {
  postulante: PostulanteDetalle
  etapas: Etapa[]
  empresaId?: string
  onClose: () => void
  onUpdated: () => Promise<void> | void
  onSelectionChanged?: () => void
}

function valorODefecto(valor: string): string {
  return valor.trim() === '' ? 'No disponible' : valor
}

export function PostulanteDetalleModal({
  postulante,
  etapas,
  empresaId,
  onClose,
  onUpdated,
  onSelectionChanged,
}: Props) {
  const [rechazando, setRechazando] = useState(false)
  const [contratando, setContratando] = useState(false)
  const [selectionVersion, setSelectionVersion] = useState(0)
  const [notas, setNotas] = useState<NotaPostulante[]>([])
  const [cargandoNotas, setCargandoNotas] = useState(true)
  const [errorNotas, setErrorNotas] = useState<string | null>(null)
  const [nuevaNota, setNuevaNota] = useState('')
  const [puntaje, setPuntaje] = useState<number | ''>(postulante.puntaje_manual ?? '')
  const [guardandoPuntaje, setGuardandoPuntaje] = useState(false)
  const [guardandoNota, setGuardandoNota] = useState(false)
  const [descargando, setDescargando] = useState(false)
  const [error, setError] = useState<string | null>(null)


  useEffect(() => {
    let activo = true
    setCargandoNotas(true)
    setErrorNotas(null)
    getNotasPostulante(postulante.id, empresaId)
      .then((items) => {
        if (activo) setNotas(items)
      })
      .catch((cause: unknown) => {
        if (!activo) return
        setNotas([])
        setErrorNotas(cause instanceof Error ? cause.message : 'No se pudieron cargar las notas.')
      })
      .finally(() => {
        if (activo) setCargandoNotas(false)
      })
    return () => {
      activo = false
    }
  }, [empresaId, postulante.id])

  const etapaActual = etapas.find((etapa) => etapa.id === postulante.etapa_id)
  const rechazado = postulante.estado === 'DESCARTADA'
  const contratado = postulante.estado === 'CONTRATADA'
  const tieneCV = postulante.cv_url != null && postulante.cv_url !== ''

  async function guardarPuntaje(evento: FormEvent) {
    evento.preventDefault()
    if (puntaje === '') return
    setGuardandoPuntaje(true)
    setError(null)
    try {
      await actualizarPuntajePostulante(postulante.id, puntaje, empresaId)
      await onUpdated()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar el puntaje.')
    } finally {
      setGuardandoPuntaje(false)
    }
  }

  async function agregarNota(evento: FormEvent) {
    evento.preventDefault()
    const contenido = nuevaNota.trim()
    if (contenido === '') return
    setGuardandoNota(true)
    setError(null)
    try {
      const nota = await agregarNotaPostulante(postulante.id, contenido, empresaId)
      setNotas((actuales) => [nota, ...actuales])
      setNuevaNota('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar la nota.')
    } finally {
      setGuardandoNota(false)
    }
  }

  async function bajarCV() {
    setDescargando(true)
    setError(null)
    try {
      await descargarCV(postulante.postulante_id, empresaId)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo descargar el CV.')
    } finally {
      setDescargando(false)
    }
  }

  return (
    <>
      <Modal
        title={postulante.nombre_postulante}
        size="lg"
        onClose={onClose}
        footer={
          <>
            {tieneCV ? (
              <Button variant="secondary" loading={descargando} onClick={() => void bajarCV()}>
                Descargar CV
              </Button>
            ) : (
              <span className="text-muted">CV no disponible</span>
            )}
            {!rechazado && !contratado && (
              <Can permisos={PERM_GESTIONAR}>
                <Button variant="danger-outline" onClick={() => setRechazando(true)}>
                  Rechazar candidato
                </Button>
              </Can>
            )}
            {!rechazado && !contratado && postulante.estado !== 'RETIRADA' && <Can permisos={['postulaciones:contratar', 'platform:postulaciones:contratar']}><Button onClick={() => setContratando(true)}>Contratar</Button></Can>}
            <Button variant="ghost" onClick={onClose}>
              Cerrar
            </Button>
          </>
        }
      >
        <div className="badge-list" role="group" aria-label="Estado y etapa del candidato">
          <EstadoBadge estado={estadoCanonico(postulante.estado)} />
          <EstadoBadge estado={etapaActual?.nombre ?? postulante.etapa} />
        </div>
        {postulante.vacante_titulo !== '' && (
          <p className="text-muted">Vacante: {postulante.vacante_titulo}</p>
        )}
        {rechazado && (
          <Alert tone="error" title="Postulación descartada">
            Motivo: {postulante.motivo_rechazo ?? 'No disponible'}
          </Alert>
        )}
        {error !== null && <Alert tone="error">{error}</Alert>}
        <BancoTalentoAction postulanteId={postulante.postulante_id} empresaId={empresaId} />

        <div className="score-box">
          <div className="info-list">
            <span className="info-label">Puntaje actual</span>
            <span className="score-value">
              {postulante.puntaje_manual == null ? '—' : `${postulante.puntaje_manual}/100`}
            </span>
          </div>
          <Can permisos={PERM_GESTIONAR}>
            <form className="filters-actions" onSubmit={(evento) => void guardarPuntaje(evento)}>
              <Field label="Puntaje" className="score-input">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={puntaje}
                  onChange={(evento) =>
                    setPuntaje(evento.target.value === '' ? '' : Number(evento.target.value))
                  }
                  required
                />
              </Field>
              <Button type="submit" size="sm" loading={guardandoPuntaje} disabled={puntaje === ''}>
                Guardar
              </Button>
            </form>
          </Can>
        </div>

        <SeleccionCandidato postulacionId={postulante.id} empresaId={empresaId} onChanged={() => { setSelectionVersion(n => n + 1); onSelectionChanged?.() }} />

        <div className="detail-grid">
          <div>
            <h3>Datos de contacto</h3>
            <div className="info-list">
              <div className="info-row">
                <span className="info-label">Correo</span>
                <a className="info-value" href={`mailto:${postulante.email}`}>{postulante.email}</a>
              </div>
              <div className="info-row">
                <span className="info-label">Teléfono</span>
                <span className="info-value">{valorODefecto(postulante.telefono)}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Ciudad</span>
                <span className="info-value">{valorODefecto(postulante.ciudad)}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Documento</span>
                <span className="info-value">{valorODefecto(postulante.documento_identidad)}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Postuló el</span>
                <span className="info-value">{formatFechaHora(postulante.fecha_postulacion)}</span>
              </div>
            </div>
          </div>
          <div>
            <h3>Perfil profesional</h3>
            <div className="info-list">
              <div className="info-row">
                <span className="info-label">Experiencia</span>
                <span className="info-value">
                  {postulante.experiencia_anios} {postulante.experiencia_anios === 1 ? 'año' : 'años'}
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">Nivel educativo</span>
                <span className="info-value">{valorODefecto(postulante.educacion)}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Seguimiento</span>
                <span className="info-value">{postulante.codigo_seguimiento}</span>
              </div>
              {postulante.linkedin != null && postulante.linkedin !== '' && (
                <div className="info-row">
                  <span className="info-label">LinkedIn</span>
                  <a className="info-value" href={postulante.linkedin} target="_blank" rel="noreferrer">
                    Ver perfil
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        <div>
          <HistorialPostulante
          key={selectionVersion}
          postulacionId={postulante.id}
          empresaId={empresaId}
        />
          <h3>Notas del equipo ({notas.length})</h3>
          <Can permisos={PERM_GESTIONAR}>
            <form className="form-stack" onSubmit={(evento) => void agregarNota(evento)}>
              <Field label="Nueva nota interna" hint="Solo la ve el equipo de reclutamiento; el candidato nunca la lee.">
                <textarea
                  rows={3}
                  maxLength={2000}
                  value={nuevaNota}
                  onChange={(evento) => setNuevaNota(evento.target.value)}
                  placeholder="Impresiones de la entrevista, acuerdos, siguientes pasos…"
                  required
                />
              </Field>
              <div className="form-actions">
                <Button type="submit" loading={guardandoNota} disabled={nuevaNota.trim() === ''}>
                  Agregar nota
                </Button>
              </div>
            </form>
          </Can>
          {errorNotas !== null && <Alert tone="error">{errorNotas}</Alert>}
          {cargandoNotas ? (
            <LoadingBlock message="Cargando notas…" />
          ) : errorNotas !== null ? null : notas.length === 0 ? (
            <p className="board-empty">Todavía no hay notas registradas.</p>
          ) : (
            <ol className="timeline">
              {notas.map((nota) => (
                <li key={nota.id} className="timeline-item">
                  <div className="timeline-header">
                    <strong>{nota.autor}</strong>
                    <span>{formatFechaHora(nota.created_at)}</span>
                  </div>
                  <p className="timeline-text">{nota.contenido}</p>
                </li>
              ))}
            </ol>
          )}
        </div>
      </Modal>

      {rechazando && (
        <RechazarPostulanteModal
          postulante={postulante}
          empresaId={empresaId}
          onClose={() => setRechazando(false)}
          onSuccess={async () => {
            setRechazando(false)
            await onUpdated()
          }}
        />
      )}

      {contratando && (
        <ContratarPostulanteModal
          postulante={postulante}
          empresaId={empresaId}
          onClose={() => setContratando(false)}
          onSuccess={async () => {
            setContratando(false)
            await onUpdated()
          }}
        />
      )}
    </>
  )
}
