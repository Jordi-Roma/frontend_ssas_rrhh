import type { ReactNode } from 'react'
import { lazy } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { ChangePasswordPage } from '../../features/auth/pages/ChangePasswordPage'
import { ForgotPasswordPage } from '../../features/auth/pages/ForgotPasswordPage'
import { LoginPage } from '../../features/auth/pages/LoginPage'
import { RegisterCompanyPage } from '../../features/auth/pages/RegisterCompanyPage'
import { ResetPasswordPage } from '../../features/auth/pages/ResetPasswordPage'
import { useAuth } from '../../features/auth/hooks/useAuth'
import { BitacoraPage } from '../../features/bitacora/pages/BitacoraPage'
import { AltaEmpresaPage } from '../../features/empresas/pages/AltaEmpresaPage'
import { ConfiguracionEmpresaPage } from '../../features/empresas/pages/ConfiguracionEmpresaPage'
import { EmpresaModulosPage } from '../../features/empresas/pages/EmpresaModulosPage'
import { OrganizacionPage } from '../../features/organizacion/pages/OrganizacionPage'
import { ImportacionPage } from '../../features/importacion/pages/ImportacionPage'
import { PortalPublicoPage } from '../../features/portal/pages/PortalPublicoPage'
import { RolesPage } from '../../features/roles/pages/RolesPage'
import { ReportesPage } from '../../features/reportes/pages/ReportesPage'
import { RespaldosPage } from '../../features/respaldos/pages/RespaldosPage'
import { RespaldosEmpresaPage } from '../../features/respaldos/pages/RespaldosEmpresaPage'
import { TableroPage } from '../../features/tablero/pages/TableroPage'
import { ListadoUsuariosPage } from '../../features/usuarios/pages/ListadoUsuariosPage'
import { VacanteFormPage } from '../../features/vacantes/pages/VacanteFormPage'
import { VacantesListPage } from '../../features/vacantes/pages/VacantesListPage'
import { HabilidadesPage } from '../../features/habilidades/pages/HabilidadesPage'
import { PostulantesPage } from '../../features/postulantes/pages/PostulantesPage'
import { MiSuscripcionPage } from '../../features/suscripciones/pages/MiSuscripcionPage'
import { PlanesPage } from '../../features/suscripciones/pages/PlanesPage'
import { MiPerfilPage } from '../../features/perfil/pages/MiPerfilPage'
import { EntrevistasPage } from '../../features/entrevistas/pages/EntrevistasPage'
import { SeleccionPage } from '../../features/seleccion/pages/SeleccionPage'
import { AyudaPage } from '../../features/ayuda/pages/AyudaPage'
import { FullPageStatus } from '../../shared/components'
import { RequireAccess } from '../guards/RequireAccess'
import { RequireRealm } from '../guards/RequireRealm'
import { AppLayout } from '../layouts/AppLayout'
import { DashboardPage } from '../pages/DashboardPage'
import { NotFoundPage } from '../pages/NotFoundPage'

const ContratosPage = lazy(() => import('../../features/personal/pages/ContratosPage').then(module => ({ default: module.ContratosPage })))
const ConfiguracionAusenciasPage = lazy(() => import('../../features/personal/pages/ConfiguracionAusenciasPage').then(module => ({ default: module.ConfiguracionAusenciasPage })))
const FichaEmpleadoPage = lazy(() => import('../../features/personal/pages/FichaEmpleadoPage').then(module => ({ default: module.FichaEmpleadoPage })))
const BoletasPage = lazy(() => import('../../features/nomina/pages/BoletasPage').then(module => ({ default: module.BoletasPage })))
const MisBoletasPage = lazy(() => import('../../features/nomina/pages/MisBoletasPage').then(module => ({ default: module.MisBoletasPage })))

function ProtectedArea() {
  const { status, user } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <FullPageStatus message="Comprobando tu sesión…" />
  if (status !== 'authenticated') return <Navigate to="/login" replace />
  if (user?.must_change_password === true && location.pathname !== '/cambiar-clave') {
    return <Navigate to="/cambiar-clave" replace />
  }
  return <AppLayout />
}

function GuestOnly({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  if (status === 'loading') return <FullPageStatus message="Comprobando tu sesión…" />
  return status === 'authenticated' ? <Navigate to="/" replace /> : children
}

function empresa(page: ReactNode, modulo: string | undefined, permisos: string[]) {
  return (
    <RequireRealm realm="tenant" allowPlatformScope>
      <RequireAccess modulo={modulo} permisos={permisos}>
        {page}
      </RequireAccess>
    </RequireRealm>
  )
}

function plataforma(page: ReactNode, permisos: string[]) {
  return (
    <RequireRealm realm="platform">
      <RequireAccess permisos={permisos}>{page}</RequireAccess>
    </RequireRealm>
  )
}

const RECLUTAMIENTO = ['vacantes:ver', 'platform:vacantes:gestionar']

function MisBoletasRoute() {
  const { user } = useAuth()
  return user?.empresaId ? <MisBoletasPage empresaId={user.empresaId} nombreEmpleado={user.name} /> : <FullPageStatus message="Resolviendo tu empresa…" />
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<GuestOnly><LoginPage /></GuestOnly>} />
      <Route path="/registro" element={<GuestOnly><RegisterCompanyPage /></GuestOnly>} />
      <Route path="/recuperar-clave" element={<GuestOnly><ForgotPasswordPage /></GuestOnly>} />
      <Route path="/restablecer-clave" element={<GuestOnly><ResetPasswordPage /></GuestOnly>} />

      <Route path="/empleos/:slug" element={<PortalPublicoPage />} />
      <Route path="/empleos/:slug/vacantes/:vacanteId" element={<PortalPublicoPage />} />
      <Route path="/empleos/:slug/seguimiento" element={<PortalPublicoPage />} />
      <Route path="/publico/:slug" element={<PortalPublicoPage />} />
      <Route path="/publico/:slug/vacantes/:vacanteId" element={<PortalPublicoPage />} />
      <Route path="/publico/:slug/seguimiento" element={<PortalPublicoPage />} />

      <Route element={<ProtectedArea />}>
        <Route index element={<DashboardPage />} />
        <Route path="cambiar-clave" element={<ChangePasswordPage />} />
        <Route path="perfil" element={<MiPerfilPage />} />
        <Route path="ayuda" element={<AyudaPage />} />

        <Route path="personal/contratos" element={empresa(<ContratosPage />, undefined, ['personal:ver', 'platform:personal:ver'])} />
        <Route path="personal/empleados/:empleadoId" element={empresa(<FichaEmpleadoPage />, undefined, ['personal:ver', 'platform:personal:ver'])} />
        <Route path="personal/ausencias/configuracion" element={empresa(<ConfiguracionAusenciasPage />, undefined, ['ausencias:mi', 'platform:ausencias:mi'])} />
        <Route path="nomina/boletas" element={empresa(<BoletasPage />, undefined, ['boletas:ver', 'platform:boletas:ver'])} />
        <Route path="nomina/mis-boletas" element={<RequireRealm realm="tenant"><RequireAccess permisos={['boletas:mi']}><MisBoletasRoute /></RequireAccess></RequireRealm>} />

        <Route path="empresas" element={plataforma(<AltaEmpresaPage />, ['platform:empresas:ver'])} />
        <Route
          path="administradores-globales"
          element={plataforma(<ListadoUsuariosPage scope="platform" />, ['platform:usuarios:gestionar'])}
        />
        <Route path="respaldos" element={plataforma(<RespaldosPage />, ['platform:backup:ver'])} />
        <Route path="respaldos-empresa" element={<RequireAccess permisos={['backup:ver', 'platform:backup:ver']}><RespaldosEmpresaPage /></RequireAccess>} />
        <Route path="planes" element={plataforma(<PlanesPage />, ['platform:planes:ver'])} />
        <Route
          path="suscripcion"
          element={
            <RequireRealm realm="tenant">
              <RequireAccess permisos={['suscripcion:ver']}>
                <MiSuscripcionPage />
              </RequireAccess>
            </RequireRealm>
          }
        />
        <Route
          path="suscripcion/resultado"
          element={<Navigate to="/suscripcion" replace />}
        />
        <Route
          path="empresas/:empresaId/modulos"
          element={plataforma(<EmpresaModulosPage />, ['platform:modulos:ver', 'platform:modulos:gestionar'])}
        />
        <Route
          path="empresa/configuracion"
          element={empresa(<ConfiguracionEmpresaPage />, 'ORGANIZACION', [
            'empresa:ver',
            'empresa:editar',
            'platform:empresas:ver',
          ])}
        />
        <Route path="configuracion" element={<Navigate to="/empresa/configuracion" replace />} />

        <Route
          path="usuarios"
          element={empresa(<ListadoUsuariosPage scope="company" />, 'USUARIOS', ['usuarios:ver', 'platform:usuarios:gestionar'])}
        />
        <Route
          path="roles"
          element={empresa(<RolesPage />, 'ROLES', ['roles:gestionar', 'platform:usuarios:gestionar'])}
        />
        <Route
          path="bitacora"
          element={empresa(<BitacoraPage />, 'BITACORA', ['bitacora:ver', 'platform:bitacora:ver'])}
        />
        <Route
          path="reportes"
          element={empresa(<ReportesPage />, 'REPORTES', ['reportes:ver', 'platform:reportes:gestionar'])}
        />
        <Route
          path="organizacion"
          element={empresa(<OrganizacionPage />, 'ORGANIZACION', [
            'departamentos:ver',
            'cargos:ver',
            'platform:organizacion:gestionar',
          ])}
        />
        <Route path="importaciones" element={empresa(<ImportacionPage />, 'ORGANIZACION', ['importacion:gestionar', 'platform:importacion:gestionar'])} />

        <Route path="vacantes" element={empresa(<VacantesListPage />, 'RECLUTAMIENTO', RECLUTAMIENTO)} />
        <Route path="postulantes" element={empresa(<PostulantesPage />, 'RECLUTAMIENTO', ['postulantes:ver', 'platform:postulantes:ver'])} />
        <Route path="habilidades" element={empresa(<HabilidadesPage />, 'RECLUTAMIENTO', ['habilidades:ver', 'platform:habilidades:gestionar'])} />
        <Route
          path="vacantes/nueva"
          element={empresa(<VacanteFormPage />, 'RECLUTAMIENTO', ['vacantes:crear', 'platform:vacantes:gestionar'])}
        />
        <Route
          path="vacantes/:id/editar"
          element={empresa(<VacanteFormPage />, 'RECLUTAMIENTO', ['vacantes:editar', 'platform:vacantes:gestionar'])}
        />
        <Route
          path="vacantes/:id/tablero"
          element={empresa(<TableroPage />, 'RECLUTAMIENTO', ['postulaciones:ver', 'platform:postulaciones:ver'])}
        />
        <Route
          path="entrevistas"
          element={empresa(<EntrevistasPage />, 'RECLUTAMIENTO', ['entrevistas:ver', 'platform:entrevistas:ver'])}
        />
        <Route path="seleccion" element={empresa(<SeleccionPage />, 'RECLUTAMIENTO', ['postulaciones:ver', 'platform:postulaciones:ver'])} />
        <Route path="vacantes/:id/seleccion" element={empresa(<SeleccionPage />, 'RECLUTAMIENTO', ['postulaciones:ver', 'platform:postulaciones:ver'])} />

        <Route path="*" element={<NotFoundPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}