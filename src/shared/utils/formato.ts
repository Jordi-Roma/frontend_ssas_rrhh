/** Convención boliviana explícita, consistente también en navegadores sin ICU es-BO. */
export function formatearBs(valor: string | number, decimales = 2): string {
  if (typeof valor === 'string' && valor.trim() === '') return '—'
  const numero = Number(valor)
  if (!Number.isFinite(numero)) return '—'
  return numero.toLocaleString('es-BO', {
    minimumFractionDigits: decimales, maximumFractionDigits: decimales,
  })
}

export function formatearFecha(iso: string | null | undefined): string {
  if (!iso) return '—'
  const date = new Date(`${iso.slice(0, 10)}T00:00:00`)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('es-BO', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

export function nombrePeriodo(gestion: number, mes: number): string {
  return new Date(gestion, mes - 1, 1).toLocaleDateString('es-BO', { month: 'long', year: 'numeric' })
}
