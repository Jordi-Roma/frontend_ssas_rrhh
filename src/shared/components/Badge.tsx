import type { ReactNode } from 'react'

export type BadgeTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info'

export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>
}

/** Un único mapa estado -> color para todo el producto. */
const ESTADO_TONE: Record<string, BadgeTone> = {
  BORRADOR: 'neutral',
  VIGENTE: 'success',
  REEMPLAZADO: 'neutral',
  VENCIDO: 'warning',
  ACTIVO: 'success',
  ABIERTO: 'neutral',
  CALCULADO: 'warning',
  APROBADO: 'success',
  PUBLICADA: 'success',
  PAUSADA: 'warning',
  CERRADA: 'neutral',
  CANCELADA: 'danger',
  ACTIVA: 'success',
  SUSPENDIDA: 'warning',
  ELIMINADA: 'danger',
  POSTULADO: 'info',
  PRESELECCIONADO: 'info',
  ENTREVISTA: 'warning',
  OFERTA: 'brand',
  CONTRATADO: 'success',
  DESCARTADO: 'danger',
  // El backend usa el femenino para el estado de la postulación.
  CONTRATADA: 'success',
  DESCARTADA: 'danger',
  PRESELECCIONADA: 'info',
  RECHAZADA: 'danger',
}

export function EstadoBadge({ estado }: { estado: string }) {
  const normalized = estado.toUpperCase()
  return <Badge tone={ESTADO_TONE[normalized] ?? 'neutral'}>{normalized}</Badge>
}
