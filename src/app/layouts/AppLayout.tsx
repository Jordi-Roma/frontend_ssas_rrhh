import { Suspense, useState } from 'react'
import {
  Award, BarChart3, BriefcaseBusiness, Building2, CalendarDays, ChevronDown,
  CircleHelp, CreditCard, DatabaseBackup, FileUp, House, KeyRound, LayoutGrid,
  ListChecks, LockKeyhole, Menu, ScrollText, Settings2, ShieldCheck, UserRound,
  Users, UsersRound, X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../features/auth/hooks/useAuth'
import { Button } from '../../shared/components'
import { useAccess } from '../access/AccessProvider'
import { NAV_ITEMS } from '../access/navigation'
import type { NavItem } from '../access/navigation'
import { useCompanyScope } from '../context/CompanyScopeContext'
import { ChatWidget } from '../../features/ayuda/components/ChatWidget'

const GROUP_ICONS: Record<string, LucideIcon> = {
  Reclutamiento: UsersRound,
  Plataforma: LayoutGrid,
  Empresa: Building2,
  Administración: ShieldCheck,
  Análisis: BarChart3,
  Cuenta: UserRound,
  Personal: UsersRound,
  Nómina: CreditCard,
}

const NAV_ICONS: Record<string, LucideIcon> = {
  '/': House,
  '/personal/contratos': ScrollText,
  '/personal/ausencias/configuracion': CalendarDays,
  '/nomina/boletas': CreditCard,
  '/nomina/mis-boletas': ScrollText,
  '/entrevistas': CalendarDays,
  '/seleccion': ListChecks,
  '/vacantes': BriefcaseBusiness,
  '/postulantes': Users,
  '/habilidades': Award,
  '/empresas': Building2,
  '/administradores-globales': ShieldCheck,
  '/respaldos': DatabaseBackup,
  '/planes': CreditCard,
  '/organizacion': UsersRound,
  '/importaciones': FileUp,
  '/empresa/configuracion': Settings2,
  '/usuarios': Users,
  '/roles': KeyRound,
  '/bitacora': ScrollText,
  '/respaldos-empresa': DatabaseBackup,
  '/reportes': BarChart3,
  '/suscripcion': CreditCard,
  '/perfil': UserRound,
  '/ayuda': CircleHelp,
  '/cambiar-clave': LockKeyhole,
}

export function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { logout, user } = useAuth()
  const { company, companies, error, selectCompany, clearCompany, loading } = useCompanyScope()
  const { can, hasModulo } = useAccess()
  const { pathname } = useLocation()

  const esPlataforma = user?.realm === 'platform'
  const esTenant = user?.realm === 'tenant'
  const conAlcanceEmpresa = esTenant || company !== null

  function cambiarEmpresa(idEmpresa: string) {
    if (idEmpresa === '') {
      clearCompany()
      return
    }
    const next = companies.find((item) => item.id === idEmpresa)
    if (next !== undefined) selectCompany(next)
  }

  // El menú es consecuencia de los módulos habilitados y de los permisos efectivos:
  // no hay ninguna entrada fija salvo Inicio y la cuenta.
  function visible(item: NavItem): boolean {
    if (item.soloRealm !== undefined && item.soloRealm !== user?.realm) return false
    if (item.modulo !== undefined) {
      if (!conAlcanceEmpresa) return false
      if (!hasModulo(item.modulo)) return false
    }
    if (item.permisos !== undefined && !can(...item.permisos)) return false
    return true
  }

  const items = NAV_ITEMS.filter(visible)
  const grupos = items.reduce<Map<string, NavItem[]>>((acc, item) => {
    const grupo = item.grupo ?? ''
    acc.set(grupo, [...(acc.get(grupo) ?? []), item])
    return acc
  }, new Map())
  const activeGroup = items.find(
    (item) => item.to !== '/' && (pathname === item.to || pathname.startsWith(`${item.to}/`)),
  )?.grupo ?? null
  const [sectionState, setSectionState] = useState<{ pathname: string; group: string | null }>({
    pathname,
    group: activeGroup,
  })
  const expandedGroup = sectionState.pathname === pathname ? sectionState.group : activeGroup

  const mostrarAlcance = esPlataforma || company !== null

  return (
    <div className="app-shell">
      <aside className={`sidebar${menuOpen ? ' sidebar-open' : ''}`}>
        <div className="sidebar-top">
          <div className="sidebar-brand">
            <div className="brand-mark brand-mark-small" aria-hidden="true">
              S
            </div>
            <div>
              <strong>SSAS</strong>
              <span>Recursos Humanos</span>
            </div>
          </div>
          <button
            className="mobile-menu-toggle"
            type="button"
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={menuOpen}
            aria-controls="main-navigation"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        <nav id="main-navigation" className="main-nav" aria-label="Navegación principal">
          {[...grupos.entries()].map(([grupo, entradas], index) => {
            const GroupIcon = GROUP_ICONS[grupo]
            const open = expandedGroup === grupo
            return (
              <div className="nav-group" key={grupo}>
                {grupo !== '' && (
                  <button
                    className={`nav-group-title${open ? ' nav-group-title-open' : ''}`}
                    type="button"
                    aria-expanded={open}
                    aria-controls={`nav-group-${index}`}
                    onClick={() => setSectionState({ pathname, group: open ? null : grupo })}
                  >
                    {GroupIcon && <GroupIcon size={17} aria-hidden="true" />}
                    <span>{grupo}</span>
                    <ChevronDown className="nav-group-chevron" size={16} aria-hidden="true" />
                  </button>
                )}
                <div id={`nav-group-${index}`} className="nav-group-links" hidden={grupo !== '' && !open}>
                  {entradas.map((item) => {
                    const Icon = NAV_ICONS[item.to]
                    return (
                      <NavLink key={item.to} to={item.to} end={item.to === '/'} onClick={() => setMenuOpen(false)}>
                        {Icon && <Icon size={17} aria-hidden="true" />}
                        <span>{item.label}</span>
                      </NavLink>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </nav>

        <div className="sidebar-user">
          <span>{user?.name}</span>
          <small>{user?.email}</small>
          <small>{esPlataforma ? 'Administración global' : 'Usuario de empresa'}</small>
          <Button variant="quiet" onClick={() => void logout()}>
            Cerrar sesión
          </Button>
        </div>
      </aside>
      <main className="main-content">
        {mostrarAlcance && (
          <header className="scope-header">
            {company !== null && (
              <div className="scope-header-chip">
                <span
                  className="scope-header-dot"
                  style={{ background: company?.color_primario ?? 'var(--brand)' }}
                />
                <div>
                  <span className="scope-header-label">Empresa activa</span>
                  <strong>{company.nombre_comercial}</strong>
                </div>
              </div>
            )}
            {esPlataforma && (
              <select
                className="scope-header-select"
                aria-label="Cambiar empresa activa"
                value={company?.id ?? ''}
                onChange={(event) => cambiarEmpresa(event.target.value)}
              >
                <option value="">Seleccionar empresa</option>
                {companies.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nombre_comercial}
                  </option>
                ))}
              </select>
            )}
            {esPlataforma && company === null && (
              <small className="scope-header-hint">Selecciona una empresa para operar sobre todos los módulos.</small>
            )}
            {loading && <small>Cargando alcance…</small>}
            {error !== null && <small>{error}</small>}
          </header>
        )}
        <Suspense fallback={<p role="status">Cargando sección…</p>}><Outlet /></Suspense>
      </main>
      {esTenant && <ChatWidget />}
    </div>
  )
}
