import type { Cargo } from '../../../shared/api/organizacionCatalogosApi'
import { EstadoBadge, Panel } from '../../../shared/components'
import { formatearBs, formatearFecha } from '../../../shared/utils/formato'
import type { Contrato } from '../api/contratosApi'

export function ContratosTimeline({ contratos, cargos }: { contratos: Contrato[]; cargos: Cargo[] }) {
  return <Panel title="Línea de tiempo" count={`${contratos.length} ${contratos.length === 1 ? 'versión' : 'versiones'}`}>
    <ol className="timeline">{contratos.map((contrato, index) => {
      const anterior = contratos[index + 1]
      const delta = anterior ? Number(contrato.salario_basico) - Number(anterior.salario_basico) : null
      return <li className="timeline-item" key={contrato.id}>
        <div className="timeline-header"><strong>{formatearFecha(contrato.fecha_inicio)} — {contrato.fecha_fin ? formatearFecha(contrato.fecha_fin) : 'Sin fecha de fin'}</strong><EstadoBadge estado={contrato.estado} /></div>
        <p className="timeline-text">{contrato.numero_contrato} · {cargos.find(item => item.id === contrato.cargo_id)?.nombre ?? 'Cargo no disponible'} · {contrato.moneda} {formatearBs(contrato.salario_basico)}</p>
        <p className={`timeline-text ${delta !== null && delta > 0 ? 'text-success' : delta !== null && delta < 0 ? 'text-danger' : 'text-muted'}`}>
          {delta === null ? 'Contrato inicial' : delta === 0 ? 'Sin cambio salarial' : `${delta > 0 ? '▲' : '▼'} ${contrato.moneda} ${formatearBs(Math.abs(delta))} respecto de la versión anterior`}
        </p>
        {contrato.motivo_cambio && <p className="timeline-text">{contrato.motivo_cambio}</p>}
      </li>
    })}</ol>
  </Panel>
}
