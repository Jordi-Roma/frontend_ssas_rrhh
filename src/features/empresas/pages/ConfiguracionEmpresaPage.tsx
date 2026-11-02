import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/hooks/useAuth'
import { useCompanyScope } from '../../../app/context/CompanyScopeContext'
import { empresasApi } from '../api/empresasApi'
import {
  actualizarParametroLegal,
  crearParametroLegal,
  getParametrosLegales,
  type ParametroLegal,
} from '../api/parametrosLegalesApi'
import type { components } from '../../../shared/api/schema'
import { Alert, Badge, Button, Field, LoadingBlock, PageHeader, Panel } from '../../../shared/components'

type Empresa = components['schemas']['EmpresaResponse']

type TabKey = 'general' | 'contacto' | 'visual' | 'portal' | 'legales'

type Feedback = { kind: 'success' | 'error'; message: string }

const TABS: { key: TabKey; label: string }[] = [
  { key: 'general', label: 'Información general' },
  { key: 'contacto', label: 'Contacto y ubicación' },
  { key: 'visual', label: 'Identidad visual' },
  { key: 'portal', label: 'Portal público' },
  { key: 'legales', label: 'Parámetros legales' },
]

const PORCENTAJE_LABELS: { field: keyof PeriodoNumero; label: string }[] = [
  { field: 'afp', label: 'AFP (%)' },
  { field: 'aporte_solidario', label: 'Aporte solidario (%)' },
  { field: 'rc_iva', label: 'RC-IVA (%)' },
  { field: 'aguinaldo', label: 'Aguinaldo (%)' },
  { field: 'prima', label: 'Prima (%)' },
]

type CompanyForm = {
  razon_social: string
  nombre_comercial: string
  nit: string
  slug: string
  email: string
  telefono: string
  ciudad: string
  direccion: string
  descripcion: string
  logo_url: string
  color_primario: string
  portal_publico_activo: boolean
}

type PeriodoNumero = {
  afp: string
  aporte_solidario: string
  rc_iva: string
  aguinaldo: string
  prima: string
}

type PeriodoForm = PeriodoNumero & {
  vigencia_desde: string
  vigencia_hasta: string
}

const EMPTY_PERIODO: PeriodoForm = {
  vigencia_desde: '',
  vigencia_hasta: '',
  afp: '',
  aporte_solidario: '',
  rc_iva: '',
  aguinaldo: '',
  prima: '',
}

function periodoInicial(): PeriodoForm {
  const hoy = new Date()
  const fin = new Date(hoy.getFullYear(), 11, 31)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  return { ...EMPTY_PERIODO, vigencia_desde: fmt(hoy), vigencia_hasta: fmt(fin) }
}

function toForm(data: Empresa | null): CompanyForm {
  return {
    razon_social: data?.razon_social || '',
    nombre_comercial: data?.nombre_comercial || '',
    nit: data?.nit || '',
    slug: data?.slug || '',
    email: data?.email || '',
    telefono: data?.telefono || '',
    ciudad: data?.ciudad || '',
    direccion: data?.direccion || '',
    descripcion: data?.descripcion || '',
    logo_url: data?.logo_url || '',
    color_primario: data?.color_primario || '#176b4b',
    portal_publico_activo: data?.portal_publico_activo ?? true,
  }
}

export function ConfiguracionEmpresaPage() {
  const { user } = useAuth()
  const { company: scopeCompany } = useCompanyScope()
  const activeEmpresaId = user?.empresaId || scopeCompany?.id

  const [loading, setLoading] = useState(true)
  const [empresa, setEmpresa] = useState<Empresa | null>(null)
  const [form, setForm] = useState<CompanyForm>(toForm(null))
  const [savingSection, setSavingSection] = useState<TabKey | null>(null)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [tab, setTab] = useState<TabKey>('general')

  const [periodos, setPeriodos] = useState<ParametroLegal[]>([])
  const [periodosLoading, setPeriodosLoading] = useState(false)
  const [periodoSaving, setPeriodoSaving] = useState(false)
  const [periodoForm, setPeriodoForm] = useState<PeriodoForm>(periodoInicial)
  const [editingPeriodoId, setEditingPeriodoId] = useState<string | null>(null)

  const dirtySections = useMemo(() => {
    const base = empresa ? toForm(empresa) : form
    return {
      general:
        form.razon_social !== base.razon_social ||
        form.nombre_comercial !== base.nombre_comercial ||
        form.nit.trim() !== base.nit ||
        form.slug !== base.slug ||
        form.descripcion !== base.descripcion,
      contacto:
        form.email.trim() !== base.email ||
        form.telefono.trim() !== base.telefono ||
        form.ciudad.trim() !== base.ciudad ||
        form.direccion.trim() !== base.direccion,
      visual: form.logo_url !== base.logo_url || form.color_primario !== base.color_primario,
      portal: form.portal_publico_activo !== base.portal_publico_activo,
      legales: false,
    }
  }, [form, empresa])

  useEffect(() => {
    if (!activeEmpresaId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setFeedback(null)
    empresasApi
      .get(activeEmpresaId)
      .then((data) => {
        setEmpresa(data)
        setForm(toForm(data))
      })
      .catch((err: Error) =>
        setFeedback({ kind: 'error', message: err.message || 'Error al cargar la información de la empresa' }),
      )
      .finally(() => setLoading(false))
  }, [activeEmpresaId])

  useEffect(() => {
    if (!activeEmpresaId || tab !== 'legales') return
    setPeriodosLoading(true)
    getParametrosLegales(activeEmpresaId)
      .then(setPeriodos)
      .catch((err: Error) =>
        setFeedback({ kind: 'error', message: err.message || 'Error al cargar parámetros legales' }),
      )
      .finally(() => setPeriodosLoading(false))
  }, [activeEmpresaId, tab])

  function setField<K extends keyof CompanyForm>(key: K, value: CompanyForm[K]) {
    setFeedback(null)
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function setPeriodoField<K extends keyof PeriodoForm>(key: K, value: PeriodoForm[K]) {
    setFeedback(null)
    setPeriodoForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSaveSeccion(
    section: TabKey,
    payload: Partial<components['schemas']['EmpresaUpdateRequest']>,
  ) {
    if (!activeEmpresaId) return
    setSavingSection(section)
    setFeedback(null)
    try {
      const updated = await empresasApi.update(activeEmpresaId, payload)
      setEmpresa(updated)
      setForm(toForm(updated))
      setFeedback({ kind: 'success', message: 'Sección guardada correctamente.' })
    } catch (err: unknown) {
      setFeedback({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Error al guardar los cambios.',
      })
    } finally {
      setSavingSection(null)
    }
  }

  function handleSaveGeneral(e: FormEvent) {
    e.preventDefault()
    void handleSaveSeccion('general', {
      razon_social: form.razon_social.trim(),
      nombre_comercial: form.nombre_comercial.trim(),
      nit: form.nit.trim(),
      slug: form.slug.trim().toLowerCase(),
      descripcion: form.descripcion.trim() || null,
    })
  }

  function handleSaveContacto(e: FormEvent) {
    e.preventDefault()
    void handleSaveSeccion('contacto', {
      email: form.email.trim() || null,
      telefono: form.telefono.trim() || null,
      ciudad: form.ciudad.trim() || null,
      direccion: form.direccion.trim() || null,
    })
  }

  function handleSaveVisual(e: FormEvent) {
    e.preventDefault()
    void handleSaveSeccion('visual', {
      logo_url: form.logo_url.trim() || null,
      color_primario: form.color_primario.trim() || '#176b4b',
    })
  }

  function handleSavePortal(e: FormEvent) {
    e.preventDefault()
    void handleSaveSeccion('portal', { portal_publico_activo: form.portal_publico_activo })
  }

  function numeroOpcional(valor: string): number | null {
    const limpio = valor.trim()
    if (!limpio) return null
    const numero = Number(limpio.replace(',', '.'))
    return Number.isFinite(numero) ? numero : null
  }

  function validarPeriodo(): string | null {
    const { vigencia_desde, vigencia_hasta } = periodoForm
    if (!vigencia_desde || !vigencia_hasta) return 'Indica las fechas de vigencia.'
    if (vigencia_desde > vigencia_hasta) return 'La fecha de inicio no puede ser posterior a la fecha de fin.'
    for (const { field } of PORCENTAJE_LABELS) {
      const valor = numeroOpcional(periodoForm[field])
      if (valor !== null && (valor < 0 || valor > 100)) {
        return 'Los porcentajes deben estar entre 0 y 100.'
      }
    }
    return null
  }

  async function handleGuardarPeriodo(e: FormEvent) {
    e.preventDefault()
    if (!activeEmpresaId) return
    const error = validarPeriodo()
    if (error) {
      setFeedback({ kind: 'error', message: error })
      return
    }
    setPeriodoSaving(true)
    setFeedback(null)
    const datos = {
      vigencia_desde: periodoForm.vigencia_desde,
      vigencia_hasta: periodoForm.vigencia_hasta,
      afp: numeroOpcional(periodoForm.afp),
      aporte_solidario: numeroOpcional(periodoForm.aporte_solidario),
      rc_iva: numeroOpcional(periodoForm.rc_iva),
      aguinaldo: numeroOpcional(periodoForm.aguinaldo),
      prima: numeroOpcional(periodoForm.prima),
    }
    try {
      if (editingPeriodoId) {
        await actualizarParametroLegal(editingPeriodoId, datos, activeEmpresaId)
        setFeedback({ kind: 'success', message: 'Periodo de parámetros actualizado.' })
      } else {
        await crearParametroLegal(datos, activeEmpresaId)
        setFeedback({ kind: 'success', message: 'Periodo de parámetros registrado.' })
      }
      setEditingPeriodoId(null)
      setPeriodoForm(periodoInicial())
      const lista = await getParametrosLegales(activeEmpresaId)
      setPeriodos(lista)
    } catch (err: unknown) {
      setFeedback({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Error al guardar el periodo.',
      })
    } finally {
      setPeriodoSaving(false)
    }
  }

  function iniciarEdicion(periodo: ParametroLegal) {
    setFeedback(null)
    setEditingPeriodoId(periodo.id)
    setPeriodoForm({
      vigencia_desde: (periodo.vigencia_desde as string).slice(0, 10),
      vigencia_hasta: (periodo.vigencia_hasta as string).slice(0, 10),
      afp: numeroTexto(periodo.afp),
      aporte_solidario: numeroTexto(periodo.aporte_solidario),
      rc_iva: numeroTexto(periodo.rc_iva),
      aguinaldo: numeroTexto(periodo.aguinaldo),
      prima: numeroTexto(periodo.prima),
    })
  }

  function cancelarEdicion() {
    setEditingPeriodoId(null)
    setPeriodoForm(periodoInicial())
  }

  if (loading) {
    return (
      <div style={{ maxWidth: 1000, margin: '2rem auto', padding: '0 1rem' }}>
        <LoadingBlock message="Cargando configuración de la empresa..." />
      </div>
    )
  }

  if (!activeEmpresaId) {
    return (
      <div style={{ maxWidth: 1000, margin: '2rem auto', padding: '0 1rem' }}>
        <Alert tone="info" title="Sin empresa seleccionada">
          Debes pertenecer a una empresa o seleccionar una en la barra superior para configurar su perfil.
        </Alert>
      </div>
    )
  }

  const portalUrl = `/empleos/${form.slug || empresa?.slug || ''}`

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '1.5rem 1rem 3rem' }}>
      <PageHeader
        eyebrow="Configuración institucional"
        title="Centro de configuración"
        description="Administra la información, la marca y los parámetros legales de la empresa. Cada sección se guarda por separado."
      />

      {feedback && (
        <div style={{ marginBottom: '1.25rem' }}>
          <Alert tone={feedback.kind} title={feedback.kind === 'success' ? 'Guardado' : 'Error'}>
            {feedback.message}
          </Alert>
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            style={{
              padding: '0.55rem 1rem',
              borderRadius: '9999px',
              border: tab === key ? '1px solid #166534' : '1px solid #e2e8f0',
              background: tab === key ? '#f0fdf4' : '#ffffff',
              color: tab === key ? '#166534' : '#475569',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            {label}
            {key !== 'legales' && dirtySections[key as 'general' | 'contacto' | 'visual' | 'portal'] && (
              <span style={{ color: '#b45309', marginLeft: '0.35rem' }} aria-hidden="true">
                {'\u2022'}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'general' && (
        <form onSubmit={handleSaveGeneral} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <Panel title="Información general y legal" eyebrow="Datos de identificación fiscal y corporativa">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              <Field label="Razón social *">
                <input className="input" value={form.razon_social} onChange={(e) => setField('razon_social', e.target.value)} required />
              </Field>
              <Field label="Nombre comercial *">
                <input className="input" value={form.nombre_comercial} onChange={(e) => setField('nombre_comercial', e.target.value)} required />
              </Field>
              <Field label="NIT *">
                <input className="input" value={form.nit} onChange={(e) => setField('nit', e.target.value)} required />
              </Field>
              <Field label="Slug identificador (URL única) *">
                <input
                  className="input"
                  value={form.slug}
                  onChange={(e) => setField('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  required
                />
              </Field>
            </div>
            <div style={{ marginTop: '1rem' }}>
              <Field label="Descripción de la empresa / Acerca de nosotros">
                <textarea
                  className="input"
                  rows={3}
                  placeholder="Breve reseña institucional que verán los postulantes en la página de empleos..."
                  value={form.descripcion}
                  onChange={(e) => setField('descripcion', e.target.value)}
                />
              </Field>
            </div>
            <SectionFooter
              dirty={dirtySections.general}
              saving={savingSection === 'general'}
              hint="Razón social, nombre comercial, NIT, slug y descripción."
            />
          </Panel>
        </form>
      )}

      {tab === 'contacto' && (
        <form onSubmit={handleSaveContacto} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <Panel title="Contacto y ubicación" eyebrow="Datos visibles para los postulantes y el equipo">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              <Field label="Correo electrónico institucional">
                <input type="email" className="input" value={form.email} onChange={(e) => setField('email', e.target.value)} />
              </Field>
              <Field label="Teléfono de contacto">
                <input className="input" value={form.telefono} onChange={(e) => setField('telefono', e.target.value)} />
              </Field>
              <Field label="Ciudad">
                <input className="input" value={form.ciudad} onChange={(e) => setField('ciudad', e.target.value)} />
              </Field>
              <Field label="Dirección comercial / Oficina">
                <input className="input" value={form.direccion} onChange={(e) => setField('direccion', e.target.value)} />
              </Field>
            </div>
            <SectionFooter
              dirty={dirtySections.contacto}
              saving={savingSection === 'contacto'}
              hint="Correo, teléfono, ciudad y dirección."
            />
          </Panel>
        </form>
      )}

      {tab === 'visual' && (
        <form onSubmit={handleSaveVisual} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <Panel title="Identidad visual y marca" eyebrow="Personalización corporativa">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', alignItems: 'flex-start' }}>
              <div>
                <Field label="URL del logotipo (PNG, SVG, JPG)">
                  <input type="url" className="input" placeholder="https://ejemplo.com/logo.png" value={form.logo_url} onChange={(e) => setField('logo_url', e.target.value)} />
                </Field>
                <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div
                    style={{
                      width: 70,
                      height: 70,
                      borderRadius: '0.5rem',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#f8fafc',
                      overflow: 'hidden',
                    }}
                  >
                    {form.logo_url ? (
                      <img
                        src={form.logo_url}
                        alt="Vista previa del logotipo"
                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                        onError={(e) => {
                          ;(e.target as HTMLElement).style.display = 'none'
                        }}
                      />
                    ) : (
                      <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Sin logo</span>
                    )}
                  </div>
                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Vista previa del logotipo.</span>
                </div>
              </div>

              <div>
                <Field label="Color primario de la marca">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <input
                      type="color"
                      value={form.color_primario}
                      onChange={(e) => setField('color_primario', e.target.value)}
                      style={{ width: 44, height: 40, padding: 2, borderRadius: '0.375rem', border: '1px solid #cbd5e1', cursor: 'pointer' }}
                    />
                    <input
                      type="text"
                      className="input"
                      value={form.color_primario}
                      onChange={(e) => setField('color_primario', e.target.value)}
                      placeholder="#176b4b"
                      style={{ fontFamily: 'monospace' }}
                    />
                  </div>
                </Field>
                <div
                  style={{
                    marginTop: '0.75rem',
                    padding: '0.65rem 1rem',
                    borderRadius: '0.5rem',
                    background: form.color_primario,
                    color: '#ffffff',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    textAlign: 'center',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  }}
                >
                  Muestra de botón principal ({form.color_primario})
                </div>
              </div>
            </div>
            <SectionFooter
              dirty={dirtySections.visual}
              saving={savingSection === 'visual'}
              hint="Logotipo y color principal de la marca."
            />
          </Panel>
        </form>
      )}

      {tab === 'portal' && (
        <form onSubmit={handleSavePortal} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <Panel title="Portal público de empleos" eyebrow="Exposición pública de ofertas laborales">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={form.portal_publico_activo}
                  onChange={(e) => setField('portal_publico_activo', e.target.checked)}
                  style={{ width: 18, height: 18, cursor: 'pointer' }}
                />
                <span style={{ fontWeight: 600, color: '#1e293b' }}>
                  Habilitar portal público de empleo para esta empresa
                </span>
              </label>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>
                Si desactivas esta opción, los postulantes no podrán ver la lista de vacantes activas ni enviar candidaturas externas.
              </p>
              {form.portal_publico_activo && form.slug && (
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.5rem',
                    padding: '1rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Dirección pública de tu portal de empleo:</div>
                    <code style={{ fontSize: '0.9rem', color: '#0d9488', fontWeight: 600 }}>
                      {window.location.origin}/empleos/{form.slug}
                    </code>
                  </div>
                  <Link
                    to={portalUrl}
                    target="_blank"
                    style={{
                      padding: '0.45rem 0.85rem',
                      borderRadius: '0.375rem',
                      background: '#0d9488',
                      color: '#ffffff',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      textDecoration: 'none',
                    }}
                  >
                    Abrir portal
                  </Link>
                </div>
              )}
            </div>
            <SectionFooter
              dirty={dirtySections.portal}
              saving={savingSection === 'portal'}
              hint="Estado de publicación del portal de empleos."
            />
          </Panel>
        </form>
      )}

      {tab === 'legales' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <Panel
            title={editingPeriodoId ? 'Editar vigencia de parámetros legales' : 'Registrar vigencia de parámetros legales'}
            eyebrow="Vigencia y porcentajes de aportes y retenciones"
          >
            <p className="text-muted">Estas vigencias son un registro histórico de porcentajes. El cálculo de nómina usa tasas legales verificadas por la administración de la plataforma. Para generar boletas, abre el mes correspondiente en <Link to="/nomina/periodos">Periodos de nómina</Link>.</p>
            <form onSubmit={handleGuardarPeriodo}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <Field label="Vigencia desde *">
                  <input type="date" className="input" value={periodoForm.vigencia_desde} onChange={(e) => setPeriodoField('vigencia_desde', e.target.value)} required />
                </Field>
                <Field label="Vigencia hasta *">
                  <input type="date" className="input" value={periodoForm.vigencia_hasta} onChange={(e) => setPeriodoField('vigencia_hasta', e.target.value)} required />
                </Field>
                {PORCENTAJE_LABELS.map(({ field, label }) => (
                  <Field key={field} label={label}>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step="0.01"
                      className="input"
                      placeholder="0.00"
                      value={periodoForm[field]}
                      onChange={(e) => setPeriodoField(field, e.target.value)}
                    />
                  </Field>
                ))}
              </div>
              <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                {editingPeriodoId && (
                  <Button type="button" variant="ghost" onClick={cancelarEdicion}>
                    Cancelar edición
                  </Button>
                )}
                <Button type="submit" variant="primary" loading={periodoSaving}>
                  {editingPeriodoId ? 'Guardar cambios del periodo' : 'Registrar periodo'}
                </Button>
              </div>
            </form>
          </Panel>

          <Panel title="Historial de periodos" eyebrow="Se mantiene el registro histórico sin eliminar periodos anteriores">
            {periodosLoading ? (
              <LoadingBlock message="Cargando periodos..." />
            ) : periodos.length === 0 ? (
              <Alert tone="info" title="Sin periodos registrados">
                Registra el primer periodo de parámetros legales para esta empresa.
              </Alert>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {periodos.map((periodo) => (
                  <div
                    key={periodo.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.75rem',
                      border: '1px solid #e2e8f0',
                      borderRadius: '0.5rem',
                      padding: '0.85rem 1rem',
                      background: '#ffffff',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: '0.9rem', color: '#1e293b' }}>
                          {(periodo.vigencia_desde as string).slice(0, 10)} al {(periodo.vigencia_hasta as string).slice(0, 10)}
                        </strong>
                        {periodo.vigente && <Badge tone="success">Vigente</Badge>}
                      </div>
                      <div style={{ marginTop: '0.35rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.8rem', color: '#475569' }}>
                        {PORCENTAJE_LABELS.map(({ field, label }) => (
                          <span key={field}>
                            {label.replace(' (%)', '')}:{' '}
                            <strong>
                              {periodo[field] !== null && periodo[field] !== undefined
                                ? `${Number(periodo[field])}%`
                                : '—'}
                            </strong>
                          </span>
                        ))}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => iniciarEdicion(periodo)}>
                      Editar
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      )}
    </div>
  )
}

function numeroTexto(valor: unknown): string {
  if (valor === null || valor === undefined) return ''
  return String(valor)
}

function SectionFooter({
  dirty,
  saving,
  hint,
}: {
  dirty: boolean
  saving: boolean
  hint: string
}) {
  return (
    <div
      style={{
        marginTop: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.75rem',
        flexWrap: 'wrap',
        borderTop: '1px solid #eef2f7',
        paddingTop: '1rem',
      }}
    >
      <span style={{ fontSize: '0.82rem', color: dirty ? '#b45309' : '#94a3b8' }}>
        {dirty ? 'Cambios sin guardar en esta sección' : hint}
      </span>
      <Button type="submit" variant="primary" loading={saving} disabled={!dirty}>
        Guardar sección
      </Button>
    </div>
  )
}
