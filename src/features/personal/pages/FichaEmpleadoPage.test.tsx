import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { FichaEmpleadoPage } from './FichaEmpleadoPage'

vi.mock('../../../app/context/CompanyScopeContext', () => ({
  useCompanyScope: () => ({ selectedCompanyId: 'empresa-1' }),
}))
vi.mock('../../../shared/components', () => ({
  PageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
  EmptyState: ({ title }: { title: string }) => <p>{title}</p>,
  EmpleadoPicker: ({ onChange }: { onChange: (id: string) => void }) =>
    <button onClick={() => onChange('empleado-1')}>Elegir empleado</button>,
  LoadingBlock: () => <p>Cargando</p>,
  Alert: () => <p>Error</p>,
}))
vi.mock('../../../shared/hooks/useAsyncResource', () => ({
  useAsyncResource: () => ({ loading: true, error: null, data: null }),
}))

function CurrentPath() {
  const location = useLocation()
  return <output>{location.pathname}</output>
}

describe('acceso al legajo', () => {
  it('abre la ficha del empleado elegido desde la ruta del menú', async () => {
    render(<MemoryRouter initialEntries={['/personal/ficha']}><Routes>
      <Route path="personal/ficha" element={<FichaEmpleadoPage />} />
      <Route path="personal/ficha/:empleadoId" element={<FichaEmpleadoPage />} />
    </Routes><CurrentPath /></MemoryRouter>)
    expect(screen.getByText('Selecciona un empleado')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Elegir empleado' }))
    expect(screen.getByText('/personal/ficha/empleado-1')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Documentos' })).toBeInTheDocument()
  })
})
