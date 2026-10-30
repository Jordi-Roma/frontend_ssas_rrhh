import { useEffect, useState } from 'react'
import { BookmarkPlus, BookmarkMinus } from 'lucide-react'
import { useAccess } from '../../../app/access/AccessProvider'
import { Alert, Button, ConfirmDialog } from '../../../shared/components'
import { actualizarBancoTalento, obtenerPostulante } from '../../postulantes/api/postulantesApi'

export function BancoTalentoAction({ postulanteId, empresaId }: { postulanteId: string; empresaId?: string }) {
  const { can } = useAccess()
  const [included, setIncluded] = useState<boolean | null>(null)
  const [error, setError] = useState('')
  const [confirm, setConfirm] = useState(false)
  const [saving, setSaving] = useState(false)
  const allowed = can('postulantes:gestionar', 'platform:postulantes:gestionar') && can('postulantes:ver', 'platform:postulantes:ver')
  useEffect(() => {
    if (!allowed) return
    let active = true
    obtenerPostulante(postulanteId, empresaId).then(p => { if (active) setIncluded(p.en_banco_talento) }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'No se pudo consultar el banco de talento.') })
    return () => { active = false }
  }, [postulanteId, empresaId, allowed])
  async function save() {
    if (saving || included === null) return
    setSaving(true); setError('')
    try { const p = await actualizarBancoTalento(postulanteId, !included, empresaId); setIncluded(p.en_banco_talento); setConfirm(false) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo actualizar el banco de talento.') }
    finally { setSaving(false) }
  }
  if (!allowed) return null
  return <div>{error && !confirm && <Alert tone="error">{error}</Alert>}{included !== null && <Button variant="secondary" onClick={() => setConfirm(true)}>{included ? <BookmarkMinus size={16} /> : <BookmarkPlus size={16} />} {included ? 'Excluir del banco de talento' : 'Incluir en banco de talento'}</Button>}{confirm && <ConfirmDialog title="Actualizar banco de talento" message={included ? 'Excluir al candidato conservando su perfil y CV.' : 'Incluir al candidato conservando su perfil y CV.'} loading={saving} error={error} onCancel={() => { if (!saving) setConfirm(false) }} onConfirm={() => void save()} />}</div>
}
