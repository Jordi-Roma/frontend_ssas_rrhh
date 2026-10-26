import type { components } from '../../../shared/api/schema'
import { nombreCompleto, type Empleado } from '../../../shared/api/empleadosApi'
import { formatearBs, nombrePeriodo } from '../../../shared/utils/formato'
import type { Boleta, Periodo } from '../api/nominaApi'

type Props = {
  boleta: Boleta
  empleado?: Empleado | null
  nombreEmpleado?: string
  periodo?: Periodo | null
  empresa: components['schemas']['EmpresaResponse'] | null
  empresaId: string
  propia?: boolean
}

/** El documento muestra los totales guardados, sin recalcular la nómina. */
export function BoletaDocumento({ boleta, empleado, nombreEmpleado, periodo, empresa, empresaId, propia = false }: Props) {
  const bloques = [
    { tipo: 'INGRESO', title: 'Ingresos', total: boleta.total_ganado, label: 'Total ganado' },
    { tipo: 'DESCUENTO', title: 'Descuentos', total: boleta.total_descuentos, label: 'Total descuentos' },
    { tipo: 'PATRONAL', title: 'Aportes del empleador', total: boleta.total_aportes_patronales, label: 'Total aportes patronales' },
  ]
  return <article className="payslip" aria-label="Boleta de pago">
    <header className="payslip-header">
      {empresa?.logo_url && <img src={empresa.logo_url} alt="" className="payslip-logo" />}
      <div><strong>{empresa?.razon_social ?? `Empresa · ref. ${empresaId}`}</strong>{empresa?.nit && <p>NIT {empresa.nit}</p>}</div>
      <div className="payslip-title"><h2>Boleta de pago</h2><p>{periodo ? nombrePeriodo(periodo.gestion, periodo.mes) : `Periodo · ref. ${boleta.periodo_id}`}</p><strong>{propia || periodo?.estado === 'APROBADO' ? 'APROBADO' : 'PROVISIONAL'}</strong></div>
    </header>
    <dl className="payslip-info">
      <div><dt>Empleado</dt><dd>{empleado ? `${empleado.codigo} — ${nombreCompleto(empleado)}` : nombreEmpleado ?? `Empleado · ref. ${boleta.empleado_id}`}</dd></div>
      <div><dt>Días trabajados</dt><dd>{boleta.dias_trabajados}</dd></div>
      <div><dt>Salario básico</dt><dd>Bs {formatearBs(boleta.salario_basico)}</dd></div>
      <div><dt>Referencia de boleta</dt><dd>{boleta.id}</dd></div>
    </dl>
    {bloques.map(bloque => <section className="payslip-section" key={bloque.tipo}>
      {bloque.tipo === 'PATRONAL' && <div className="payslip-net"><strong>Líquido pagable</strong><strong>Bs {formatearBs(boleta.liquido_pagable)}</strong></div>}
      <h3>{bloque.title}</h3>
      {bloque.tipo === 'PATRONAL' && <p className="text-muted">No se descuentan al trabajador.</p>}
      <table><caption className="sr-only">{bloque.title}</caption><thead><tr><th>Código</th><th>Concepto</th><th className="cell-right">Monto (Bs)</th></tr></thead>
        <tbody>{boleta.detalle.filter(item => item.tipo === bloque.tipo).map((item, index) => <tr key={`${item.codigo}:${index}`}><td>{item.codigo}</td><td>{item.nombre}</td><td className="cell-right">{formatearBs(item.monto)}</td></tr>)}</tbody>
        <tfoot><tr><th colSpan={2}>{bloque.label}</th><td className="cell-right">Bs {formatearBs(bloque.total)}</td></tr></tfoot>
      </table>
    </section>)}
    <div className="payslip-signatures"><div>Firma del empleador</div><div>Firma del trabajador</div></div>
    <footer className="payslip-footer">Consulta generada desde SSAS RRHH el {new Date().toLocaleDateString('es-BO')}.</footer>
  </article>
}
