import type { Empleado } from '../../../shared/api/empleadosApi'
import { nombreCompleto } from '../../../shared/api/empleadosApi'

export function DatosEmpleado({ empleado }: { empleado: Empleado }) {
  return (
    <div className="panel">
      <h3>{nombreCompleto(empleado)}</h3>
      <dl className="definition-list">
        <dt>Código</dt>
        <dd>{empleado.codigo}</dd>

        <dt>Nombres</dt>
        <dd>{empleado.nombres}</dd>

        <dt>Apellido paterno</dt>
        <dd>{empleado.apellido_paterno}</dd>

        <dt>Apellido materno</dt>
        <dd>{empleado.apellido_materno ?? '—'}</dd>

        <dt>Estado</dt>
        <dd>{empleado.estado}</dd>
      </dl>
    </div>
  )
}