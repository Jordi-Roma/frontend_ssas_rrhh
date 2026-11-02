import type { Empleado } from '../../../shared/api/empleadosApi'
import { nombreCompleto } from '../../../shared/api/empleadosApi'
import { UserRound } from 'lucide-react'

export function DatosEmpleado({ empleado }: { empleado: Empleado }) {
  return (
    <div className="panel legajo-data">
      <div className="legajo-person-heading"><span className="legajo-person-avatar"><UserRound size={27} aria-hidden="true" /></span><div><span className="legajo-eyebrow">Datos del empleado</span><h2>{nombreCompleto(empleado)}</h2><p>Ficha de identificación y estado laboral</p></div><span className="legajo-status">{empleado.estado}</span></div>
      <dl className="legajo-data-grid">
        <div><dt>Código</dt><dd>{empleado.codigo}</dd></div>
        <div><dt>Nombres</dt><dd>{empleado.nombres}</dd></div>
        <div><dt>Apellido paterno</dt><dd>{empleado.apellido_paterno}</dd></div>
        <div><dt>Apellido materno</dt><dd>{empleado.apellido_materno ?? '—'}</dd></div>
      </dl>
    </div>
  )
}
