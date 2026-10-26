import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getEmpleado, getEmpleados } from '../api/empleadosApi'
import { empleado } from '../../test/sprint3Fixtures'
import { EmpleadoPicker } from './EmpleadoPicker'

vi.mock('../api/empleadosApi', async original => ({ ...await original<typeof import('../api/empleadosApi')>(), getEmpleados: vi.fn(), getEmpleado: vi.fn() }))
beforeEach(() => { vi.resetAllMocks(); vi.mocked(getEmpleado).mockResolvedValue(empleado) })
afterEach(cleanup)
describe('Selector de empleados', () => {
  it('ofrece la siguiente página aunque los primeros 50 empleados sean inactivos', async () => {
    vi.mocked(getEmpleados).mockResolvedValueOnce(Array.from({ length: 50 }, (_, index) => ({ ...empleado, id: `inactivo-${index}`, estado: 'INACTIVO' }))).mockResolvedValueOnce([empleado])
    render(<EmpleadoPicker empresaId="empresa-demo" value={null} onChange={vi.fn()} />)
    await userEvent.click(await screen.findByRole('button', { name: 'Cargar más empleados' }))
    expect(await screen.findByRole('option', { name: /EMP-DEMO-01/ })).toBeInTheDocument()
    expect(getEmpleados).toHaveBeenLastCalledWith('empresa-demo', 50, 50)
  })
  it('restablece la selección y descarta respuestas tardías de otra empresa', async () => {
    let finish!: (value: typeof empleado[]) => void
    vi.mocked(getEmpleados).mockImplementationOnce(() => new Promise(resolve => { finish = resolve })).mockResolvedValueOnce([])
    const onChange = vi.fn()
    const view = render(<EmpleadoPicker empresaId="empresa-a" value={empleado.id} onChange={onChange} />)
    view.rerender(<EmpleadoPicker empresaId="empresa-b" value={empleado.id} onChange={onChange} />)
    await act(async () => finish([empleado]))
    expect(onChange).toHaveBeenCalledWith(null)
    expect(screen.queryByRole('option', { name: /EMP-DEMO-01/ })).not.toBeInTheDocument()
    expect(await screen.findByText('Esta empresa aún no tiene empleados registrados.')).toBeInTheDocument()
  })
  it('resuelve el jefe preseleccionado aunque esté fuera de la primera página', async () => {
    vi.mocked(getEmpleados).mockResolvedValue([])
    render(<EmpleadoPicker empresaId="empresa-demo" value={empleado.id} onChange={vi.fn()} label="Jefe directo" />)
    expect(await screen.findByRole('option', { name: /EMP-DEMO-01/ })).toBeInTheDocument()
    expect(getEmpleado).toHaveBeenCalledWith(empleado.id, 'empresa-demo')
    expect(screen.getByLabelText('Jefe directo')).toHaveValue(empleado.id)
  })
})
