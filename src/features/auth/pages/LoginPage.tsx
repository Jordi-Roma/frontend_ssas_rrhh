import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AuthShell } from '../components/AuthShell'
import { LoginForm } from '../components/LoginForm'
import type { AuthRealm } from '../context/AuthContext'
import { useAuth } from '../hooks/useAuth'

export function LoginPage() {
  const { login } = useAuth()
  const location = useLocation()
  const [realm, setRealm] = useState<AuthRealm>('tenant')
  return (
    <AuthShell title="Bienvenido" description="Seleccioná tu tipo de acceso e ingresá tus credenciales.">
      {location.state?.passwordChanged === true && (
        <p className="success-message" role="status">Contraseña actualizada. Iniciá sesión con la nueva contraseña.</p>
      )}
      <LoginForm realm={realm} onRealmChange={setRealm} onSubmit={login} />
      {realm === 'tenant' ? (
        <>
          <p className="auth-link"><Link to="/recuperar-clave">¿Olvidaste tu contraseña?</Link></p>
          <p className="auth-link" style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0' }}>
            ¿No tienes cuenta? <Link to="/registro" style={{ fontWeight: 600 }}>Registra tu empresa aquí</Link>
          </p>
        </>
      ) : (
        <p className="auth-link">La recuperación de plataforma debe gestionarla un administrador autorizado.</p>
      )}
    </AuthShell>
  )
}
