import type { ReactNode } from 'react'

type FieldProps = {
  label: string
  children: ReactNode
  error?: string | null
  hint?: string
  className?: string
  group?: boolean
}

/** Etiqueta, control, pista y error con el mismo ritmo en todos los formularios. */
export function Field({ label, children, error, hint, className = '', group = false }: FieldProps) {
  const classes = ['field', error ? 'field-invalid' : '', className].filter(Boolean).join(' ')
  const content = (
    <>
      <span>{label}</span>
      {children}
      {hint !== undefined && error == null && <span className="field-hint">{hint}</span>}
      {error != null && (
        <span className="field-error" role="alert">
          {error}
        </span>
      )}
    </>
  )
  return group
    ? <div className={classes} role="group" aria-label={label}>{content}</div>
    : <label className={classes}>{content}</label>
}
