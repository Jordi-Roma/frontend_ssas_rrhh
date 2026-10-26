import { useCallback } from 'react'
import { getEmpleado, nombreCompleto } from '../../../shared/api/empleadosApi'
import type { Cargo, Departamento } from '../../../shared/api/organizacionCatalogosApi'
import { Alert, Button, EstadoBadge, Panel } from '../../../shared/components'
import { useAsyncResource } from '../../../shared/hooks/useAsyncResource'
import { formatearBs, formatearFecha } from '../../../shared/utils/formato'
import type { Contrato } from '../api/contratosApi'

export function ContratoVigente({ contrato, cargos, departamentos, empresaId }: {
  contrato: Contrato; cargos: Cargo[]; departamentos: Departamento[]; empresaId: string
}) {
  const loadManager = useCallback(() => contrato.jefe_directo_id ? getEmpleado(contrato.jefe_directo_id, empresaId) : Promise.resolve(null), [contrato.jefe_directo_id, empresaId])
  const manager = useAsyncResource(loadManager)
  const rows = [
    ['N.º de contrato', contrato.numero_contrato],
    ['Cargo', cargos.find(item => item.id === contrato.cargo_id)?.nombre ?? `Cargo no disponible (${contrato.cargo_id})`],
    ['Departamento', departamentos.find(item => item.id === contrato.departamento_id)?.nombre ?? `Departamento no disponible (${contrato.departamento_id})`],
    ['Jefe directo', contrato.jefe_directo_id === null ? 'Sin jefe directo' : manager.loading ? 'Consultando…' : manager.data ? `${manager.data.codigo} — ${nombreCompleto(manager.data)}` : 'No disponible'],
    ['Tipo / Modalidad', `${contrato.tipo_contrato} · ${contrato.modalidad}`],
    ['Jornada', `${contrato.jornada} · ${formatearBs(contrato.horas_jornada)} h · entrada ${contrato.hora_entrada_programada.slice(0, 5)} · ${contrato.minutos_descanso} min de descanso`],
    ['Salario básico', `${contrato.moneda === 'BOB' ? 'Bs' : contrato.moneda} ${formatearBs(contrato.salario_basico)}`],
    ['Vigencia', `${formatearFecha(contrato.fecha_inicio)} — ${contrato.fecha_fin ? formatearFecha(contrato.fecha_fin) : 'Sin fecha de fin'}`],
    ['Motivo del cambio', contrato.motivo_cambio || 'Sin motivo registrado'],
  ]
  return <Panel title={contrato.estado === 'VIGENTE' ? 'Contrato vigente' : 'Contrato más reciente'} actions={<EstadoBadge estado={contrato.estado} />}>
    <dl className="info-list">{rows.map(([label, value]) => <div className="info-row" key={label}><dt className="info-label">{label}</dt><dd className="info-value">{value}</dd></div>)}</dl>
    {manager.error && <Alert tone="error">No se pudo consultar al jefe directo: {manager.error} <Button variant="secondary" size="sm" onClick={manager.reload}>Reintentar</Button></Alert>}
  </Panel>
}
