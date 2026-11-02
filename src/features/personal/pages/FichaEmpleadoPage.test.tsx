import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { getEmpleado } from '../../../shared/api/empleadosApi'
import { getContratos } from '../api/contratosApi'
import { FichaEmpleadoPage } from './FichaEmpleadoPage'

vi.mock('../../../app/context/CompanyScopeContext', () => ({
  useCompanyScope: () => ({ selectedCompanyId: 'empresa-1' }),
}))
vi.mock('../../../shared/api/empleadosApi', () => ({ getEmpleado: vi.fn() }))
vi.mock('../api/contratosApi', () => ({ getContratos: vi.fn() }))
vi.mock('../components/DatosEmpleado', () => ({ DatosEmpleado: () => <p>Datos del empleado cargados</p> }))
vi.mock('../components/ContratosTimeline', () => ({ ContratosTimeline: () => <p>Contratos cargados</p> }))
vi.mock('../../../shared/components', () => ({
  PageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
  EmptyState: ({ title }: { title: string }) => <p>{title}</p>,
  EmpleadoPicker: ({ onChange }: { onChange: (id: string) => void }) =>
    <button onClick={() => onChange('empleado-1')}>Elegir empleado</button>,
  LoadingBlock: () => <p>Cargando</p>,
  Alert: () => <p>Error</p>,
}))

function CurrentPath() {
  const location = useLocation()
  return <output>{location.pathname}</output>
}

describe('acceso al legajo', () => {
  it('abre la ficha del empleado elegido desde la ruta del menú', async () => {
    vi.mocked(getEmpleado).mockResolvedValue({ id: 'empleado-1' } as never)
    vi.mocked(getContratos).mockResolvedValue([])
    render(<MemoryRouter initialEntries={['/personal/ficha']}><Routes>
      <Route path="personal/ficha" element={<FichaEmpleadoPage />} />
      <Route path="personal/ficha/:empleadoId" element={<FichaEmpleadoPage />} />
    </Routes><CurrentPath /></MemoryRouter>)
    expect(screen.getByText('Selecciona un empleado')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Elegir empleado' }))
    expect(screen.getByText('/personal/ficha/empleado-1')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Documentos' })).toBeInTheDocument()
    expect(await screen.findByText('Datos del empleado cargados')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: 'Contratos' }))
    expect(await screen.findByText('Contratos cargados')).toBeInTheDocument()
    expect(getEmpleado).toHaveBeenCalledTimes(1)
    expect(getContratos).toHaveBeenCalledTimes(1)
  })
})
