import { useState } from 'react'
import { Download, Upload } from 'lucide-react'
import { useCompanyScope } from '../../../app/context/CompanyScopeContext'
import { useAccess } from '../../../app/access/AccessProvider'
import { useAuth } from '../../auth/hooks/useAuth'
import { Alert, Badge, Button, Field, PageHeader, Panel } from '../../../shared/components'
import { importacionApi, type TipoCatalogo, type VistaImportacion } from '../api/importacionApi'

const tipos: { value: TipoCatalogo; label: string }[] = [
  { value: 'departamentos', label: 'Departamentos' },
  { value: 'cargos', label: 'Cargos' },
  { value: 'habilidades', label: 'Habilidades' },
  { value: 'etapas', label: 'Etapas de reclutamiento' },
  { value: 'motivos_rechazo', label: 'Motivos de rechazo' },
  { value: 'usuarios', label: 'Usuarios y roles' },
  { value: 'empleados', label: 'Empleados existentes' },
]

export function ImportacionPage() {
  const { selectedCompanyId } = useCompanyScope()
  const { user } = useAuth()
  return <Importacion key={selectedCompanyId ?? 'sin-empresa'} empresaId={selectedCompanyId ?? undefined} requiresCompany={user?.realm === 'platform'} />
}

function Importacion({ empresaId, requiresCompany }: { empresaId?: string; requiresCompany: boolean }) {
  const { can } = useAccess()
  const canImportUsers = can('usuarios:crear', 'platform:usuarios:gestionar')
  const canImportEmployees = can('empleados:importar', 'platform:empleados:importar')
  const [tipo, setTipo] = useState<TipoCatalogo>('departamentos')
  const [formato, setFormato] = useState<'csv' | 'xlsx'>('csv')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<VistaImportacion | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null)

  function reset(nextType: TipoCatalogo) { setTipo(nextType); setFile(null); setPreview(null); setMessage(null) }
  async function runPreview() {
    if (!file) return
    setBusy(true); setMessage(null)
    try { setPreview(await importacionApi.preview(tipo, file, empresaId)) }
    catch (error) { setPreview(null); setMessage({ tone: 'error', text: error instanceof Error ? error.message : 'No se pudo previsualizar.' }) }
    finally { setBusy(false) }
  }
  async function confirm() {
    if (!file || !preview || preview.errores) return
    setBusy(true); setMessage(null)
    try {
      const result = await importacionApi.confirm(tipo, file, preview.sha256, empresaId)
      setMessage({ tone: 'success', text: `${result.crear} registros creados; ${result.omitir} ya existían.` })
      setPreview(null); setFile(null)
    } catch (error) { setMessage({ tone: 'error', text: error instanceof Error ? error.message : 'No se pudo importar.' }) }
    finally { setBusy(false) }
  }

  return <section className="page-stack">
    <PageHeader title="Importar datos" eyebrow="Organización" description="Carga datos solo para la empresa seleccionada." />
    {requiresCompany && !empresaId && <Alert tone="info">Selecciona una empresa para importar sus datos.</Alert>}
    {message && <Alert tone={message.tone}>{message.text}</Alert>}
    <Panel title="Archivo de importación">
      <div className="toolbar" role="group" aria-label="Preparar importación">
        <Field label="Datos"><select value={tipo} onChange={event => reset(event.target.value as TipoCatalogo)}>{tipos.filter(option => (option.value !== 'usuarios' || canImportUsers) && (option.value !== 'empleados' || canImportEmployees)).map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>
        <Field label="Plantilla"><select value={formato} onChange={event => setFormato(event.target.value as 'csv' | 'xlsx')}><option value="csv">CSV</option><option value="xlsx">Excel (.xlsx)</option></select></Field>
        <Field label="Archivo"><input type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={event => { setFile(event.target.files?.[0] ?? null); setPreview(null); setMessage(null) }} /></Field>
      </div>
      {tipo === 'etapas' && <p>Indica si o no en las columnas inicial, contratado y rechazado. Debe existir una etapa inicial.</p>}
      {tipo === 'usuarios' && <p>Usa el código de un rol activo de esta empresa. El administrador aprueba los correos; los usuarios deberán cambiar su contraseña al entrar. El archivo contiene contraseñas iniciales: guárdalo de forma privada y elimínalo después de importar.</p>}
      {tipo === 'empleados' && <Alert tone="info">El archivo contiene datos personales y bancarios. Usa fechas AAAA-MM-DD; en Excel, da formato Texto al código, CI, teléfono y número de cuenta para conservar ceros iniciales. La vista previa oculta CI, contactos y cuenta. No se crean cuentas de acceso ni se modifican empleados existentes. Guarda el archivo de forma privada y elimínalo después de importar.</Alert>}
      <div className="row-actions">
        <Button variant="secondary" onClick={() => void importacionApi.plantilla(tipo, formato, empresaId).catch(error => setMessage({ tone: 'error', text: error instanceof Error ? error.message : 'No se pudo descargar la plantilla.' }))}><Download size={16} />Descargar plantilla</Button>
        <Button disabled={!file || busy || (requiresCompany && !empresaId)} loading={busy} onClick={() => void runPreview()}><Upload size={16} />Previsualizar</Button>
      </div>
    </Panel>
    {preview && <Panel title="Vista previa" count={`${preview.filas.length} filas`}>
      <p>{preview.crear} para crear · {preview.omitir} existentes · {preview.errores} con errores</p>
      <div className="table-wrap"><table><thead><tr><th>Fila</th><th>Nombre</th><th>Acción</th><th>Detalle</th></tr></thead><tbody>{preview.filas.map(row => <tr key={row.fila}>
        <td>{row.fila}</td><td>{tipo === 'empleados' ? `${row.datos.codigo} · ${row.datos.nombres} ${row.datos.apellido_paterno}` : <>{row.datos.nombre}{row.datos.apellido ? ` ${row.datos.apellido}` : ''}{row.datos.email ? ` · ${row.datos.email}` : ''}</>}</td><td><Badge tone={row.accion === 'error' ? 'danger' : row.accion === 'crear' ? 'success' : 'neutral'}>{row.accion}</Badge></td><td>{row.errores.join('; ') || '—'}</td>
      </tr>)}</tbody></table></div>
      <Button disabled={busy || preview.errores > 0 || (requiresCompany && !empresaId)} loading={busy} onClick={() => void confirm()}>Confirmar importación</Button>
    </Panel>}
  </section>
}
