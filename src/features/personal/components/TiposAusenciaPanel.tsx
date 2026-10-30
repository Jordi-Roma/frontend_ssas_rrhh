import { useCallback } from 'react'
import { Alert, Badge, DataTable, Panel } from '../../../shared/components'
import { useAsyncResource } from '../../../shared/hooks/useAsyncResource'
import { getTiposAusencia, type TipoAusencia } from '../api/ausenciasApi'

export function TiposAusenciaPanel({ empresaId }: { empresaId: string }) {
  const load = useCallback(() => getTiposAusencia(empresaId), [empresaId])
  const resource = useAsyncResource(load)
  return <Panel title="Tipos de ausencia" eyebrow="Catálogo activo">
    <Alert tone="info">Los tipos de ausencia se consultan en modo de solo lectura. Su alta, edición y baja estarán disponibles cuando se habilite la configuración.</Alert>
    <DataTable<TipoAusencia> rows={resource.data ?? []} rowKey={item => item.id} loading={resource.loading} error={resource.error} onRetry={resource.reload} emptyMessage="No hay tipos de ausencia activos para esta empresa." caption="Tipos de ausencia activos"
      columns={[
        { key: 'codigo', header: 'Código', render: item => <strong>{item.codigo}</strong> },
        { key: 'nombre', header: 'Nombre', render: item => item.nombre },
        { key: 'remunerado', header: 'Remunerado', render: item => <Badge tone={item.es_remunerado ? 'success' : 'neutral'}>{item.es_remunerado ? 'Sí' : 'No'}</Badge> },
        { key: 'vacacion', header: 'Descuenta vacaciones', render: item => <Badge tone={item.descuenta_vacacion ? 'warning' : 'neutral'}>{item.descuenta_vacacion ? 'Sí' : 'No'}</Badge> },
      ]} />
  </Panel>
}
