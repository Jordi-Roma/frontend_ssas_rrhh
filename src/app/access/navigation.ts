/** Modelo único de navegación: el menú, los guards de ruta y el panel de módulos
 *  del superadministrador leen todos de aquí. */
export type NavItem = {
  to: string
  label: string
  /** Código de módulo que la empresa debe tener habilitado. */
  modulo?: string
  /** Basta con tener uno de estos permisos. El segundo suele ser el de plataforma. */
  permisos?: string[]
  /** Restringe la entrada a un único alcance. */
  soloRealm?: 'tenant' | 'platform'
  grupo?: string
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Inicio' },
  { to: '/personal/contratos', label: 'Contratos', permisos: ['personal:ver', 'platform:personal:ver'], grupo: 'Personal' },
  { to: '/personal/ficha', label: 'Ficha de empleado', permisos: ['personal:ver', 'platform:personal:ver'], grupo: 'Personal' },
  { to: '/personal/ausencias/configuracion', label: 'Configuración de ausencias', permisos: ['ausencias:mi', 'platform:ausencias:mi'], grupo: 'Personal' },
  { to: '/nomina/boletas', label: 'Boletas de pago', permisos: ['boletas:ver', 'platform:boletas:ver'], grupo: 'Nómina' },
  { to: '/nomina/mis-boletas', label: 'Mis boletas', soloRealm: 'tenant', permisos: ['boletas:mi'], grupo: 'Cuenta' },
  { to: '/entrevistas', label: 'Entrevistas', modulo: 'RECLUTAMIENTO', permisos: ['entrevistas:ver', 'platform:entrevistas:ver'], grupo: 'Reclutamiento' },
  { to: '/seleccion', label: 'Selección', modulo: 'RECLUTAMIENTO', permisos: ['postulaciones:ver', 'platform:postulaciones:ver'], grupo: 'Reclutamiento' },
  {
    to: '/empresas',
    label: 'Empresas',
    soloRealm: 'platform',
    permisos: ['platform:empresas:ver'],
    grupo: 'Plataforma',
  },
  {
    to: '/administradores-globales',
    label: 'Administradores globales',
    soloRealm: 'platform',
    permisos: ['platform:usuarios:gestionar'],
    grupo: 'Plataforma',
  },
  {
    to: '/vacantes',
    label: 'Vacantes',
    modulo: 'RECLUTAMIENTO',
    permisos: ['vacantes:ver', 'platform:vacantes:gestionar'],
    grupo: 'Reclutamiento',
  },
  {
    to: '/postulantes',
    label: 'Postulantes',
    modulo: 'RECLUTAMIENTO',
    permisos: ['postulantes:ver', 'platform:postulantes:ver'],
    grupo: 'Reclutamiento',
  },
  {
    to: '/habilidades',
    label: 'Habilidades',
    modulo: 'RECLUTAMIENTO',
    permisos: ['habilidades:ver', 'platform:habilidades:gestionar'],
    grupo: 'Reclutamiento',
  },
  {
    to: '/organizacion',
    label: 'Organización',
    modulo: 'ORGANIZACION',
    permisos: ['departamentos:ver', 'cargos:ver', 'platform:organizacion:gestionar'],
    grupo: 'Empresa',
  },
  { to: '/importaciones', label: 'Importar datos', modulo: 'ORGANIZACION', permisos: ['importacion:gestionar', 'platform:importacion:gestionar'], grupo: 'Empresa' },
  {
    to: '/empresa/configuracion',
    label: 'Configuración',
    modulo: 'ORGANIZACION',
    permisos: ['empresa:ver', 'empresa:editar', 'platform:empresas:ver'],
    grupo: 'Empresa',
  },
  {
    to: '/usuarios',
    label: 'Usuarios',
    modulo: 'USUARIOS',
    permisos: ['usuarios:ver', 'platform:usuarios:gestionar'],
    grupo: 'Administración',
  },
  {
    to: '/roles',
    label: 'Roles y permisos',
    modulo: 'ROLES',
    permisos: ['roles:gestionar', 'platform:usuarios:gestionar'],
    grupo: 'Administración',
  },
  {
    to: '/bitacora',
    label: 'Bitácora',
    modulo: 'BITACORA',
    permisos: ['bitacora:ver', 'platform:bitacora:ver'],
    grupo: 'Administración',
  },
  {
    to: '/reportes',
    label: 'Reportes',
    modulo: 'REPORTES',
    permisos: ['reportes:ver', 'platform:reportes:gestionar'],
    grupo: 'Análisis',
  },
  {
    to: '/respaldos',
    label: 'Backup / Restore',
    soloRealm: 'platform',
    permisos: ['platform:backup:ver'],
    grupo: 'Plataforma',
  },
  {
    to: '/respaldos-empresa',
    label: 'Respaldos por empresa',
    permisos: ['backup:ver', 'platform:backup:ver'],
    grupo: 'Administración',
  },
  {
    to: '/planes',
    label: 'Planes y suscripciones',
    soloRealm: 'platform',
    permisos: ['platform:planes:ver'],
    grupo: 'Plataforma',
  },
  {
    to: '/suscripcion',
    label: 'Mi suscripción',
    soloRealm: 'tenant',
    permisos: ['suscripcion:ver'],
    grupo: 'Cuenta',
  },
  { to: '/perfil', label: 'Mi perfil', grupo: 'Cuenta' },
  { to: '/ayuda', label: 'Ayuda', grupo: 'Cuenta' },
  { to: '/cambiar-clave', label: 'Cambiar contraseña', grupo: 'Cuenta' },
]
