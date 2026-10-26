import { useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Printer } from 'lucide-react'
import type { components } from '../../../shared/api/schema'
import { getEmpleado, type Empleado } from '../../../shared/api/empleadosApi'
import { Alert, Button, LoadingBlock, Modal } from '../../../shared/components'
import { useAsyncResource } from '../../../shared/hooks/useAsyncResource'
import { getBoleta, getMiBoleta, type Periodo } from '../api/nominaApi'
import { BoletaDocumento } from './BoletaDocumento'

export function BoletaConsulta({ boletaId, empresaId, empresa, empleado, nombreEmpleado, periodo, propia = false, onClose }: {
  boletaId: string; empresaId: string; empresa: components['schemas']['EmpresaResponse'] | null
  empleado?: Empleado | null; nombreEmpleado?: string; periodo?: Periodo | null; propia?: boolean; onClose: () => void
}) {
  const load = useCallback(() => propia ? getMiBoleta(boletaId) : getBoleta(boletaId, empresaId), [propia, boletaId, empresaId])
  const resource = useAsyncResource(load)
  const loadEmployee = useCallback(async () => {
    if (propia || empleado || !resource.data) return empleado ?? null
    return getEmpleado(resource.data.empleado_id, empresaId)
  }, [propia, empleado, resource.data, empresaId])
  const employeeResource = useAsyncResource(loadEmployee)
  return createPortal(<div className="payslip-overlay"><Modal title="Consulta de boleta" size="lg" onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Cerrar</Button><Button disabled={!resource.data || (!propia && employeeResource.loading)} onClick={() => window.print()}><Printer size={16} aria-hidden="true" />Imprimir</Button></>}>
    {resource.loading && <LoadingBlock message="Cargando boleta…" />}
    {resource.error && <Alert tone="error">{resource.error}<Button variant="secondary" onClick={resource.reload}>Reintentar boleta</Button></Alert>}
    {empresa === null && <div className="no-print"><Alert tone="info">La razón social de la empresa no está disponible para tu cuenta. La consulta muestra su referencia.</Alert></div>}
    {employeeResource.error && <div className="no-print"><Alert tone="error">No se pudo consultar la ficha del empleado. {employeeResource.error}<Button variant="secondary" onClick={employeeResource.reload}>Reintentar empleado</Button></Alert></div>}
    {!propia && periodo?.estado !== 'APROBADO' && <div className="no-print"><Alert tone="info">Boleta provisional: el periodo todavía no está aprobado.</Alert></div>}
    {resource.data && <BoletaDocumento boleta={resource.data} empresa={empresa} empresaId={empresaId} empleado={employeeResource.data ?? empleado} nombreEmpleado={nombreEmpleado} periodo={periodo} propia={propia} />}
  </Modal></div>, document.body)
}
