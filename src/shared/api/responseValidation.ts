import type { paths } from './schema'

export type GetResponse<P extends keyof paths> = paths[P]['get'] extends {
  responses: { 200: { content: { 'application/json': infer T } } }
} ? T : unknown

/** El OpenAPI publicado deja algunas respuestas sin esquema (unknown).
 * Se validan en el límite HTTP; los tipos de lectura se infieren de estos parsers.
 * No se sustituyen datos ausentes por importes cero ni por listas vacías. */
function invalid(): never {
  throw new Error('La respuesta del servidor no tiene el formato esperado. Vuelve a consultar o contacta al administrador.')
}

export function record(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return invalid()
  return value as Record<string, unknown>
}

export function text(value: unknown): string {
  return typeof value === 'string' ? value : invalid()
}

export function nullableText(value: unknown): string | null {
  return value === null ? null : text(value)
}

export function numeric(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : invalid()
}

export function decimal(value: unknown): string | number {
  if (typeof value === 'number') return numeric(value)
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return value
  return invalid()
}

export function boolean(value: unknown): boolean {
  return typeof value === 'boolean' ? value : invalid()
}

export function list<T>(value: unknown, parse: (item: unknown) => T): T[] {
  return Array.isArray(value) ? value.map(parse) : invalid()
}
