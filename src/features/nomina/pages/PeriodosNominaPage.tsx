import { useCallback, useState, type FormEvent } from 'react'
import { useCompanyScope } from '../../../app/context/CompanyScopeContext'
import { Alert, Button, DataTable, EmptyState, Field, LoadingBlock, PageHeader, Panel } from '../../../shared/components'
import { useAsyncResource } from '../../../shared/hooks/useAsyncResource'
import { EmpleadoPicker } from '../../../shared/components/EmpleadoPicker'
import { abrirPeriodo, aprobarPeriodo, calcularPeriodo, getPeriodos, registrarDatosTributarios, type Periodo } from '../api/periodosApi'

export function PeriodosNominaPage() {
  const { selectedCompanyId } = useCompanyScope()
  if (!selectedCompanyId) return <EmptyState title="Selecciona una empresa" />

  return <Periodos empresaId={selectedCompanyId} />
}

function Periodos({ empresaId }: { empresaId: string }) {
  const load = useCallback(() => getPeriodos(empresaId), [empresaId])
  const resource = useAsyncResource(load)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [gestion, setGestion] = useState(new Date().getFullYear())
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [opening, setOpening] = useState(false)
  const [taxPeriod, setTaxPeriod] = useState<string | null>(null)
  const [taxEmployee, setTaxEmployee] = useState('')
  const [taxReference, setTaxReference] = useState('')
  const [taxValues, setTaxValues] = useState({ f110_credito: '0', saldo_favor_anterior: '0', mantenimiento_valor: '0', saldo_siete_rg: '0', f110_siete_rg: '0' })
  const [taxSaving, setTaxSaving] = useState(false)
  const [taxSuccess, setTaxSuccess] = useState<string | null>(null)

  async function saveTax(event: FormEvent) {
    event.preventDefault()
    if (!taxPeriod || !taxEmployee) return
    setTaxSaving(true); setError(null); setTaxSuccess(null)
    try {
      await registrarDatosTributarios(taxPeriod, {
        empleado_id: taxEmployee,
        f110_credito: Number(taxValues.f110_credito),
        saldo_favor_anterior: Number(taxValues.saldo_favor_anterior),
        mantenimiento_valor: Number(taxValues.mantenimiento_valor),
        saldo_siete_rg: Number(taxValues.saldo_siete_rg),
        f110_siete_rg: Number(taxValues.f110_siete_rg),
        referencia_planilla: taxReference.trim(),
      }, empresaId)
      setTaxSuccess('Datos tributarios guardados para este empleado. Repite el registro para cada empleado con contrato en el período.')
      setTaxEmployee(''); setTaxReference('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudieron guardar los datos tributarios.')
    } finally { setTaxSaving(false) }
  }

  async function abrir(event: FormEvent) {
    event.preventDefault()
    setOpening(true); setError(null)
    try {
      await abrirPeriodo(gestion, mes, empresaId)
      resource.reload()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo abrir el periodo de nómina.')
    } finally { setOpening(false) }
  }

  async function accion(periodoId: string, tipo: 'calcular' | 'aprobar') {
    setBusyId(periodoId)
    setError(null)
    try {
      if (tipo === 'calcular') await calcularPeriodo(periodoId, empresaId)
      else await aprobarPeriodo(periodoId, empresaId)
      resource.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo completar la acción')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="page-stack">
      <PageHeader title="Periodos de nómina" eyebrow="Nómina" description="Abrir, calcular y aprobar periodos." />

      <Panel title="Abrir periodo de nómina">
        <p className="text-muted">Elige el mes a liquidar. Las vigencias de parámetros legales se configuran aparte en Empresa → Configuración.</p>
        <form className="filters" onSubmit={event => void abrir(event)}>
          <Field label="Gestión"><input type="number" min="2000" max="2100" value={gestion} onChange={event => setGestion(Number(event.target.value))} required /></Field>
          <Field label="Mes"><select value={mes} onChange={event => setMes(Number(event.target.value))}>{Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>{new Intl.DateTimeFormat('es', { month: 'long' }).format(new Date(2026, index, 1))}</option>)}</select></Field>
          <div className="filters-actions"><Button type="submit" loading={opening}>Abrir periodo</Button></div>
        </form>
      </Panel>

      {resource.loading && <LoadingBlock message="Cargando periodos…" />}
      {resource.error && <Alert tone="error">{resource.error}</Alert>}
      {error && <Alert tone="error">{error}</Alert>}

      {!resource.loading && !resource.error && (resource.data?.length ?? 0) === 0 && (
        <EmptyState title="No hay periodos" />
      )}

      <DataTable<Periodo>
        rows={resource.data ?? []}
        rowKey={p => p.id}
        columns={[
          { key: 'periodo', header: 'Periodo', render: p => `${p.gestion}-${String(p.mes).padStart(2, '0')}` },
          { key: 'estado', header: 'Estado', render: p => p.estado },
          {
            key: 'acciones',
            header: 'Acciones',
            render: p => (
              <div className="row-actions">
                {p.estado !== 'APROBADO' && (
                  <Button size="sm" loading={busyId === p.id} onClick={() => accion(p.id, 'calcular')}>
                    Calcular
                  </Button>
                )}
                {p.estado === 'ABIERTO' && <Button size="sm" variant="secondary" onClick={() => { setTaxPeriod(p.id); setTaxSuccess(null); setError(null) }}>Datos RC-IVA</Button>}
                {p.estado === 'CALCULADO' && (
                  <Button size="sm" variant="secondary" loading={busyId === p.id} onClick={() => accion(p.id, 'aprobar')}>
                    Aprobar
                  </Button>
                )}
              </div>
            ),
          },
        ]}
      />
      {taxPeriod && <Panel title={`Datos RC-IVA · ${resource.data?.find(p => p.id === taxPeriod)?.gestion ?? ''}-${String(resource.data?.find(p => p.id === taxPeriod)?.mes ?? '').padStart(2, '0')}`}>
        <p className="text-muted">Registra los datos verificados de cada empleado con contrato antes de calcular. Si no presentó F110 ni tiene saldos anteriores, registra cero con una referencia comprobable. No inventes importes.</p>
        {taxSuccess && <Alert tone="success">{taxSuccess}</Alert>}
        <form onSubmit={event => void saveTax(event)}>
          <div className="filters">
            <EmpleadoPicker empresaId={empresaId} value={taxEmployee || null} onChange={id => setTaxEmployee(id ?? '')} soloActivos={false} />
            {Object.entries(taxValues).map(([key, value]) => <Field key={key} label={({ f110_credito: 'Crédito F110 (Bs)', saldo_favor_anterior: 'Saldo a favor anterior (Bs)', mantenimiento_valor: 'Mantenimiento de valor (Bs)', saldo_siete_rg: 'Saldo 7-RG (Bs)', f110_siete_rg: 'F110 7-RG (Bs)' } as Record<string, string>)[key]}><input type="number" min="0" step="0.01" value={value} onChange={event => setTaxValues(current => ({ ...current, [key]: event.target.value }))} required /></Field>)}
            <Field label="Referencia de planilla tributaria"><input value={taxReference} onChange={event => setTaxReference(event.target.value)} minLength={3} maxLength={160} required placeholder="Ej.: Planilla RC-IVA 2026-11" /></Field>
          </div>
          <div className="row-actions"><Button type="submit" loading={taxSaving} disabled={!taxEmployee}>Guardar datos</Button><Button type="button" variant="secondary" onClick={() => setTaxPeriod(null)}>Cerrar</Button></div>
        </form>
      </Panel>}
    </div>
  )
}
