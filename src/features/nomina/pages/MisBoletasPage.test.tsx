import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../shared/api/httpClient'
import { boleta, empresa } from '../../../test/sprint3Fixtures'
import { getMiBoleta, getMisBoletas, getPeriodos } from '../api/nominaApi'
import { MisBoletasPage } from './MisBoletasPage'

vi.mock('../../../app/context/CompanyScopeContext', () => ({ useCompanyScope: () => ({ company: empresa }) }))
vi.mock('../../../app/access/AccessProvider', () => ({ useAccess: () => ({ can: () => false }) }))
vi.mock('../api/nominaApi', async original => ({ ...await original<typeof import('../api/nominaApi')>(), getMisBoletas: vi.fn(), getMiBoleta: vi.fn(), getPeriodos: vi.fn() }))
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(getMisBoletas).mockResolvedValue([{ id: boleta.id, periodo_id: boleta.periodo_id, liquido_pagable: boleta.liquido_pagable }]); vi.mocked(getMiBoleta).mockResolvedValue(boleta)
})
afterEach(cleanup)
function page() { return <MisBoletasPage empresaId="empresa-demo" nombreEmpleado="Lucía Demo Ejemplo" /> }
describe('Boletas propias', () => {
  it('consulta exclusivamente los endpoints propios sin exigir permisos de RRHH', async () => {
    render(page()); await userEvent.click(await screen.findByRole('button', { name: 'Ver boleta' }))
    const document = await screen.findByRole('article', { name: 'Boleta de pago' })
    expect(within(document).getByText('Lucía Demo Ejemplo')).toBeInTheDocument(); expect(within(document).getByText('APROBADO')).toBeInTheDocument()
    expect(getMiBoleta).toHaveBeenCalledWith(boleta.id); expect(getPeriodos).not.toHaveBeenCalled()
    expect(screen.queryByLabelText('Empleado')).not.toBeInTheDocument()
  })
  it('muestra el vacío de boletas aprobadas', async () => {
    vi.mocked(getMisBoletas).mockResolvedValue([]); render(page())
    expect(await screen.findByText('Todavía no tienes boletas aprobadas.')).toBeInTheDocument()
  })
  it('permite reintentar una consulta rechazada sin presentarla como vacío', async () => {
    vi.mocked(getMisBoletas).mockRejectedValueOnce(new ApiError('Cuenta no asociada a un empleado', 404)).mockResolvedValueOnce([])
    render(page()); await screen.findByText('Cuenta no asociada a un empleado')
    expect(screen.queryByText('Todavía no tienes boletas aprobadas.')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    await screen.findByText('Todavía no tienes boletas aprobadas.')
  })
})
