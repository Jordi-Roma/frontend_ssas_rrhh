import type { Empleado } from '../shared/api/empleadosApi'
import type { Cargo, Departamento } from '../shared/api/organizacionCatalogosApi'
import type { components } from '../shared/api/schema'
import type { Contrato } from '../features/personal/api/contratosApi'
import type { Boleta, Periodo } from '../features/nomina/api/nominaApi'

// Datos exclusivamente ficticios para pruebas. Nunca se crean en un servicio real.
export const empleado: Empleado = {
  id: '10000000-0000-4000-8000-000000000001', empresa_id: 'empresa-demo', codigo: 'EMP-DEMO-01',
  nombres: 'Lucía Demo', apellido_paterno: 'Ejemplo', apellido_materno: null, fecha_ingreso: '2026-01-15', estado: 'ACTIVO',
}
export const cargo: Cargo = {
  id: '20000000-0000-4000-8000-000000000001', empresa_id: 'empresa-demo', departamento_id: '30000000-0000-4000-8000-000000000001',
  nombre: 'Analista de Sistemas', activo: true, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
}
export const departamento: Departamento = { id: cargo.departamento_id!, empresa_id: 'empresa-demo', nombre: 'Tecnología', activo: true }
export const empresa: components['schemas']['EmpresaResponse'] = {
  id: 'empresa-demo', razon_social: 'Empresa Demostración SRL', nombre_comercial: 'Empresa Demo', slug: 'demo',
  nit: '0000000000', color_primario: '', portal_publico_activo: false, activo: true, eliminada: false,
  fecha_registro: '2026-01-01T00:00:00Z', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
}
export const contrato: Contrato = {
  id: 'contrato-demo', empresa_id: 'empresa-demo', empleado_id: empleado.id, cargo_id: cargo.id, departamento_id: departamento.id,
  jefe_directo_id: null, contrato_anterior_id: null, numero_contrato: 'CT-DEMO-01', tipo_contrato: 'INDEFINIDO', modalidad: 'PRESENCIAL',
  jornada: 'COMPLETA', hora_entrada_programada: '08:30:00', horas_jornada: '8.00', minutos_descanso: 60,
  salario_basico: '9500.00', moneda: 'BOB', fecha_inicio: '2026-10-01', fecha_fin: null, motivo_cambio: 'Ascenso de demostración',
  estado: 'VIGENTE', creado_en: '2026-10-01T00:00:00Z',
}
export const periodo: Periodo = { id: 'periodo-demo', empresa_id: 'empresa-demo', gestion: 2026, mes: 10, estado: 'APROBADO', calculado_en: '2026-10-24T00:00:00Z', aprobado_en: '2026-10-25T00:00:00Z' }
export const boleta: Boleta = {
  id: 'boleta-demo', periodo_id: periodo.id, empleado_id: empleado.id, dias_trabajados: 30,
  salario_basico: '9500.00', total_ganado: '9920.00', total_descuentos: '2107.55', liquido_pagable: '7812.45', total_aportes_patronales: '1359.04',
  detalle: [
    { codigo: 'SALARIO_BASICO', nombre: 'Salario básico', tipo: 'INGRESO', monto: '9500.00' },
    { codigo: 'HORAS_EXTRA', nombre: 'Horas extraordinarias autorizadas', tipo: 'INGRESO', monto: '420.00' },
    { codigo: 'AFP', nombre: 'Aporte laboral SIP', tipo: 'DESCUENTO', monto: '1270.24' },
    { codigo: 'RC_IVA', nombre: 'RC-IVA', tipo: 'DESCUENTO', monto: '837.31' },
    { codigo: 'CNS_PATRONAL', nombre: 'Caja Nacional de Salud', tipo: 'PATRONAL', monto: '992.00' },
    { codigo: 'VIVIENDA_PATRONAL', nombre: 'Vivienda patronal', tipo: 'PATRONAL', monto: '198.40' },
    { codigo: 'RIESGO_PATRONAL', nombre: 'Riesgo profesional', tipo: 'PATRONAL', monto: '168.64' },
  ],
}
