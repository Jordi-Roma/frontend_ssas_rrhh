import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../api/authApi'
import { tokenStorage } from '../../../shared/api/session'
import { useAuth } from '../hooks/useAuth'
import { Alert, Button, Field, Panel } from '../../../shared/components'

export function RegisterCompanyPage() {
  const navigate = useNavigate()
  const { refreshUser } = useAuth()

  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [form, setForm] = useState({
    razon_social: '',
    nombre_comercial: '',
    slug: '',
    nit: '',
    email: '',
    telefono: '',
    ciudad: '',
    color_primario: '#176b4b',
    descripcion: '',
    admin_nombre: '',
    admin_apellido: '',
    admin_email: '',
    admin_username: '',
    admin_password: '',
    admin_password_confirm: '',
    admin_telefono: '',
  })

  function handleSlugAutofill(nombre: string) {
    if (!form.slug || form.slug === form.nombre_comercial.toLowerCase().replace(/[^a-z0-9]/g, '')) {
      const autoSlug = nombre.toLowerCase().replace(/[^a-z0-9]/g, '')
      setForm((prev) => ({ ...prev, nombre_comercial: nombre, slug: autoSlug }))
    } else {
      setForm((prev) => ({ ...prev, nombre_comercial: nombre }))
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErrorMsg(null)

    if (form.admin_password !== form.admin_password_confirm) {
      setErrorMsg('Las contraseñas ingresadas no coinciden.')
      return
    }

    if (form.admin_password.length < 12) {
      setErrorMsg('La contraseña debe tener al menos 12 caracteres.')
      return
    }

    setLoading(true)
    try {
      const response = await authApi.registroEmpresa({
        razon_social: form.razon_social.trim(),
        nombre_comercial: form.nombre_comercial.trim(),
        slug: form.slug.trim().toLowerCase(),
        nit: form.nit.trim() || null,
        email: form.email.trim() || null,
        telefono: form.telefono.trim() || null,
        ciudad: form.ciudad.trim() || null,
        color_primario: form.color_primario.trim() || '#176b4b',
        descripcion: form.descripcion.trim() || null,
        admin_nombre: form.admin_nombre.trim(),
        admin_apellido: form.admin_apellido.trim(),
        admin_email: form.admin_email.trim(),
        admin_username: form.admin_username.trim(),
        admin_password: form.admin_password,
        admin_telefono: form.admin_telefono.trim() || null,
      })

      // Almacenar token y autenticar la sesión
      tokenStorage.set({
        access_token: response.access_token,
        refresh_token: response.refresh_token,
        realm: 'tenant',
      })

      await refreshUser()
      navigate('/', { replace: true })
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'No se pudo completar el registro de la empresa.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '2rem 1rem 4rem' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem' }}>
            Registra tu Empresa en SSAS RRHH
          </h1>
          <p style={{ color: '#64748b', fontSize: '1rem', margin: 0 }}>
            Comienza a gestionar tu equipo, departamentos, vacantes y postulaciones en minutos.
          </p>
        </div>

        {errorMsg && (
          <div style={{ marginBottom: '1.5rem' }}>
            <Alert tone="error" title="Error de registro">
              {errorMsg}
            </Alert>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <Panel
            title="1. Información de la Empresa"
            eyebrow="Identificación oficial y comercial de tu organización"
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
              <Field label="Razón Social *">
                <input
                  className="input"
                  placeholder="Ej. Soluciones Digitales S.R.L."
                  value={form.razon_social}
                  onChange={(e) => setForm({ ...form, razon_social: e.target.value })}
                  required
                />
              </Field>

              <Field label="Nombre Comercial *">
                <input
                  className="input"
                  placeholder="Ej. SoluDigital"
                  value={form.nombre_comercial}
                  onChange={(e) => handleSlugAutofill(e.target.value)}
                  required
                />
              </Field>

              <Field label="Slug de la empresa (Identificador URL) *">
                <input
                  className="input"
                  placeholder="ej. soludigital"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                  required
                />
              </Field>

              <Field label="NIT">
                <input
                  className="input"
                  placeholder="Ej. 1020304050"
                  value={form.nit}
                  onChange={(e) => setForm({ ...form, nit: e.target.value })}
                />
              </Field>

              <Field label="Email de Contacto Empresarial">
                <input
                  type="email"
                  className="input"
                  placeholder="contacto@empresa.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </Field>

              <Field label="Teléfono Empresarial">
                <input
                  className="input"
                  placeholder="+591 70000000"
                  value={form.telefono}
                  onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                />
              </Field>

              <Field label="Ciudad">
                <input
                  className="input"
                  placeholder="Ej. Santa Cruz de la Sierra"
                  value={form.ciudad}
                  onChange={(e) => setForm({ ...form, ciudad: e.target.value })}
                />
              </Field>

              <Field label="Color Primario de la Marca">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="color"
                    value={form.color_primario}
                    onChange={(e) => setForm({ ...form, color_primario: e.target.value })}
                    style={{ width: 42, height: 38, padding: 2, borderRadius: '0.375rem', cursor: 'pointer' }}
                  />
                  <input
                    className="input"
                    value={form.color_primario}
                    onChange={(e) => setForm({ ...form, color_primario: e.target.value })}
                    placeholder="#176b4b"
                  />
                </div>
              </Field>
            </div>
          </Panel>

          <Panel
            title="2. Administrador Principal"
            eyebrow="Credenciales de acceso empresarial"
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
              <Field label="Nombre *">
                <input
                  className="input"
                  placeholder="Ej. Juan"
                  value={form.admin_nombre}
                  onChange={(e) => setForm({ ...form, admin_nombre: e.target.value })}
                  required
                />
              </Field>

              <Field label="Apellido *">
                <input
                  className="input"
                  placeholder="Ej. Pérez"
                  value={form.admin_apellido}
                  onChange={(e) => setForm({ ...form, admin_apellido: e.target.value })}
                  required
                />
              </Field>

              <Field label="Correo Electrónico (Login) *">
                <input
                  type="email"
                  className="input"
                  placeholder="juan.perez@empresa.com"
                  value={form.admin_email}
                  onChange={(e) => setForm({ ...form, admin_email: e.target.value })}
                  required
                />
              </Field>

              <Field label="Nombre de Usuario (Username) *">
                <input
                  className="input"
                  placeholder="juanperez"
                  value={form.admin_username}
                  onChange={(e) => setForm({ ...form, admin_username: e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, '') })}
                  required
                />
              </Field>

              <Field label="Contraseña (Mínimo 12 caracteres) *">
                <input
                  type="password"
                  className="input"
                  placeholder="Mínimo 12 caracteres"
                  value={form.admin_password}
                  onChange={(e) => setForm({ ...form, admin_password: e.target.value })}
                  required
                />
              </Field>

              <Field label="Confirmar Contraseña *">
                <input
                  type="password"
                  className="input"
                  placeholder="Repite la contraseña"
                  value={form.admin_password_confirm}
                  onChange={(e) => setForm({ ...form, admin_password_confirm: e.target.value })}
                  required
                />
              </Field>

              <Field label="Teléfono de Contacto">
                <input
                  className="input"
                  placeholder="Ej. +591 71234567"
                  value={form.admin_telefono}
                  onChange={(e) => setForm({ ...form, admin_telefono: e.target.value })}
                />
              </Field>
            </div>
          </Panel>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
            <Button
              variant="primary"
              size="lg"
              type="submit"
              loading={loading}
              style={{ width: '100%', maxWidth: 360 }}
            >
              Completar Registro y Entrar
            </Button>

            <div style={{ fontSize: '0.9rem', color: '#64748b' }}>
              ¿Ya tienes una cuenta registrada?{' '}
              <Link to="/login" style={{ color: '#0d9488', fontWeight: 600, textDecoration: 'none' }}>
                Inicia sesión aquí
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
