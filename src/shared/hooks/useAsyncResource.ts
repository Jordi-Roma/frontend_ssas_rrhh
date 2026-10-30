import { useCallback, useEffect, useState } from 'react'

/** El cargador debe ser estable (useCallback). Se descartan respuestas fuera de alcance. */
export function useAsyncResource<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const reload = useCallback(() => setRevision(value => value + 1), [])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    setData(null)
    load().then(result => { if (active) setData(result) })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'No se pudo completar la consulta.')
      }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [load, revision])

  return { data, loading, error, reload }
}
