import type { ReactNode } from 'react'
import { Alert } from './Alert'
import { Button } from './Button'

export type Column<T> = {
  key: string
  header: ReactNode
  render: (row: T) => ReactNode
  align?: 'left' | 'right'
}

type DataTableProps<T> = {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  loading?: boolean
  error?: string | null
  onRetry?: () => void
  emptyMessage?: string
  className?: string
  caption?: string
}

/** Tabla con los cuatro estados resueltos: cargando, error, vacío y con datos. */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  error = null,
  onRetry,
  emptyMessage = 'No hay registros para mostrar.',
  className = '',
  caption,
}: DataTableProps<T>) {
  if (error != null) {
    return (
      <Alert tone="error" title="No se pudieron cargar los datos">
        <span>{error}</span>
        {onRetry !== undefined && (
          <span>
            <Button variant="secondary" size="sm" onClick={onRetry}>
              Reintentar
            </Button>
          </span>
        )}
      </Alert>
    )
  }

  return (
    <div className="table-wrap">
      <table className={className}>
        {caption !== undefined && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} className={column.align === 'right' ? 'cell-right' : undefined}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading &&
            [0, 1, 2, 3, 4].map((index) => (
              <tr key={`skeleton-${index}`}>
                {columns.map((column) => (
                  <td key={column.key}>
                    <span className="skeleton skeleton-text skeleton-block" />
                  </td>
                ))}
              </tr>
            ))}
          {!loading && rows.length === 0 && (
            <tr>
              <td className="empty-table" colSpan={columns.length}>
                {emptyMessage}
              </td>
            </tr>
          )}
          {!loading &&
            rows.map((row) => (
              <tr key={rowKey(row)}>
                {columns.map((column) => (
                  <td key={column.key} className={column.align === 'right' ? 'cell-right' : undefined}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  )
}
