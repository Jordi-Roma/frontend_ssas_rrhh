import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { Alert, Button, LoadingBlock } from '../../../shared/components'
import { ChatWidget } from '../../ayuda/components/ChatWidget'
import { VacantesPublicasList } from '../components/VacantesPublicasList'
import { VacantePublicaDetalle } from '../components/VacantePublicaDetalle'
import { PostulacionForm } from '../components/PostulacionForm'
import { SeguimientoPostulacion } from '../components/SeguimientoPostulacion'
import {
  PortalApiError,
  getEmpresaPublica,
  getVacantePublica,
  getVacantesPublicas,
  type EmpresaPublica,
  type VacantePublica,
} from '../api/portalApi'

type CargaError = {
  message: string
  notFound: boolean
}

function leerError(causa: unknown, respaldo: string): CargaError {
  if (causa instanceof PortalApiError) {
    return { message: causa.message, notFound: causa.isNotFound }
  }
  return { message: respaldo, notFound: false }
}

export function PortalPublicoPage() {
  const { slug = '', vacanteId } = useParams()
  const { pathname } = useLocation()
  const [empresa, setEmpresa] = useState<EmpresaPublica | null>(null)
  const [vacantes, setVacantes] = useState<VacantePublica[]>([])
  const [vacante, setVacante] = useState<VacantePublica | null>(null)
  const [postulando, setPostulando] = useState(false)
  const [loadingEmpresa, setLoadingEmpresa] = useState(true)
  const [loadingVacantes, setLoadingVacantes] = useState(true)
  const [loadingVacante, setLoadingVacante] = useState(false)
  const [errorEmpresa, setErrorEmpresa] = useState<CargaError | null>(null)
  const [errorVacantes, setErrorVacantes] = useState<string | null>(null)
  const [errorVacante, setErrorVacante] = useState<string | null>(null)
  const [intento, setIntento] = useState(0)

  // Las dos familias de rutas públicas conviven: los enlaces se quedan en la
  // que el candidato abrió, para no romper el enlace que le compartieron.
  const basePath = pathname.startsWith('/publico/') ? `/publico/${slug}` : `/empleos/${slug}`
  const seguimientoHref = `${basePath}/seguimiento`
  const enSeguimiento = pathname.endsWith('/seguimiento')
  const enDetalle = vacanteId !== undefined
  const nombreEmpresa = empresa === null ? '' : empresa.nombre_comercial || empresa.nombre
  const inicial = nombreEmpresa.charAt(0).toUpperCase()
  const descripcionEmpresa = empresa?.descripcion?.trim() ?? ''

  const reintentar = useCallback(() => setIntento((valor) => valor + 1), [])

  useEffect(() => {
    if (slug === '') {
      setEmpresa(null)
      setErrorEmpresa({
        message: 'El enlace no incluye el identificador de la empresa.',
        notFound: true,
      })
      setLoadingEmpresa(false)
      setLoadingVacantes(false)
      return
    }

    let vigente = true
    setLoadingEmpresa(true)
    setErrorEmpresa(null)

    getEmpresaPublica(slug)
      .then((datos) => {
        if (!vigente) return
        setEmpresa(datos)
      })
      .catch((causa: unknown) => {
        if (!vigente) return
        setEmpresa(null)
        setErrorEmpresa(leerError(causa, 'No se pudo cargar el sitio de empleo.'))
      })
      .finally(() => {
        if (vigente) setLoadingEmpresa(false)
      })

    return () => {
      vigente = false
    }
  }, [slug, intento])

  useEffect(() => {
    if (slug === '') return

    let vigente = true
    setLoadingVacantes(true)
    setErrorVacantes(null)

    getVacantesPublicas(slug)
      .then((lista) => {
        if (!vigente) return
        setVacantes(lista)
      })
      .catch((causa: unknown) => {
        if (!vigente) return
        setVacantes([])
        setErrorVacantes(leerError(causa, 'No se pudieron cargar las vacantes.').message)
      })
      .finally(() => {
        if (vigente) setLoadingVacantes(false)
      })

    return () => {
      vigente = false
    }
  }, [slug, intento])

  useEffect(() => {
    if (slug === '' || vacanteId === undefined) {
      setVacante(null)
      setErrorVacante(null)
      setLoadingVacante(false)
      return
    }

    let vigente = true
    setPostulando(false)
    setLoadingVacante(true)
    setErrorVacante(null)

    getVacantePublica(slug, vacanteId)
      .then((datos) => {
        if (!vigente) return
        setVacante(datos)
      })
      .catch((causa: unknown) => {
        if (!vigente) return
        setVacante(null)
        setErrorVacante(leerError(causa, 'No se pudo cargar esta vacante.').message)
      })
      .finally(() => {
        if (vigente) setLoadingVacante(false)
      })

    return () => {
      vigente = false
    }
  }, [slug, vacanteId, intento])

  // Una aplicación de una sola página solo puede corregir el título ya en el
  // navegador: el HTML que sirve el servidor sigue siendo el mismo para todas
  // las rutas.
  useEffect(() => {
    if (nombreEmpresa === '') return
    const anterior = document.title
    document.title =
      vacante !== null && enDetalle
        ? `${vacante.titulo} · Empleos en ${nombreEmpresa}`
        : `Empleos en ${nombreEmpresa}`
    return () => {
      document.title = anterior
    }
  }, [nombreEmpresa, vacante, enDetalle])

  return (
    <div className="public-page">
      <div className="public-wrap">
        {loadingEmpresa && <LoadingBlock message="Cargando el sitio de empleo…" />}

        {!loadingEmpresa && errorEmpresa !== null && (
          <div className="form-stack">
            <Alert
              tone={errorEmpresa.notFound ? 'info' : 'error'}
              title={
                errorEmpresa.notFound
                  ? 'No encontramos este sitio de empleo'
                  : 'No pudimos cargar el sitio de empleo'
              }
            >
              {errorEmpresa.notFound
                ? 'El enlace que seguiste apunta a una empresa que no existe o que cerró su sitio de empleo.'
                : errorEmpresa.message}
            </Alert>
            <div className="form-actions-start">
              <Button variant="secondary" onClick={reintentar}>
                Reintentar
              </Button>
            </div>
          </div>
        )}

        {!loadingEmpresa && errorEmpresa === null && empresa !== null && (
          <>
            <header className="public-header">
              <div className="public-brand">
                <span className="brand-mark brand-mark-small" aria-hidden="true">
                  {inicial}
                </span>
                <div>
                  <strong>{nombreEmpresa}</strong>
                  <span className="text-muted">Trabaja con nosotros</span>
                </div>
              </div>
              <nav className="public-nav" aria-label="Secciones del sitio de empleo">
                <Link to={basePath} aria-current={!enSeguimiento ? 'page' : undefined}>
                  Vacantes
                </Link>
                <Link to={seguimientoHref} aria-current={enSeguimiento ? 'page' : undefined}>
                  Consultar mi postulación
                </Link>
              </nav>
            </header>

            {empresa.portal_publico_activo === false ? (
              <Alert tone="info" title="Sitio de empleo en pausa">
                {nombreEmpresa} no está recibiendo postulaciones en este momento. Vuelve a
                intentarlo más adelante.
              </Alert>
            ) : enSeguimiento ? (
              <SeguimientoPostulacion volverHref={basePath} />
            ) : enDetalle ? (
              <>
                {loadingVacante && <LoadingBlock message="Cargando la vacante…" />}

                {!loadingVacante && errorVacante !== null && (
                  <div className="form-stack">
                    <Alert tone="error" title="No pudimos abrir esta vacante">
                      {errorVacante}
                    </Alert>
                    <div className="form-actions-start">
                      <Button variant="secondary" onClick={reintentar}>
                        Reintentar
                      </Button>
                      <Link to={basePath} className="button button-ghost">
                        Ver todas las vacantes
                      </Link>
                    </div>
                  </div>
                )}

                {!loadingVacante &&
                  errorVacante === null &&
                  vacante !== null &&
                  (postulando ? (
                    <PostulacionForm
                      vacante={vacante}
                      empresaNombre={nombreEmpresa}
                      seguimientoHref={seguimientoHref}
                      onBack={() => setPostulando(false)}
                    />
                  ) : (
                    <VacantePublicaDetalle
                      vacante={vacante}
                      volverHref={basePath}
                      onPostular={() => setPostulando(true)}
                    />
                  ))}
              </>
            ) : (
              <>
                <section className="public-hero">
                  <h1>Trabaja en {nombreEmpresa}</h1>
                  <p>
                    {descripcionEmpresa !== ''
                      ? descripcionEmpresa
                      : `Mira las vacantes abiertas de ${nombreEmpresa}, postúlate en línea y sigue el avance de tu candidatura con el código que te damos al terminar.`}
                  </p>
                  {!loadingVacantes && errorVacantes === null && (
                    <p className="badge-list">
                      <span className="chip">
                        {vacantes.length}{' '}
                        {vacantes.length === 1 ? 'vacante abierta' : 'vacantes abiertas'}
                      </span>
                    </p>
                  )}
                </section>

                <VacantesPublicasList
                  vacantes={vacantes}
                  basePath={basePath}
                  loading={loadingVacantes}
                  error={errorVacantes}
                  onRetry={reintentar}
                />
              </>
            )}

            <footer className="public-footer">
              <p>
                Sitio de empleo de {nombreEmpresa}. Cada postulación la revisa su equipo de
                selección.
              </p>
              <p>
                Tus datos se usan solo para este proceso. Si necesitas corregirlos o eliminarlos,
                escribe a la empresa.
              </p>
            </footer>
          </>
        )}
      </div>
      {empresa !== null && <ChatWidget key={slug} slug={slug} />}
    </div>
  )
}
