import { apiRequest, buildQuery } from '../../../shared/api/httpClient'
import { decimal, list, nullableText, numeric, record, text, type GetResponse } from '../../../shared/api/responseValidation'

function parsePeriodo(value: unknown) {
  const row = record(value)
  return { id: text(row.id), empresa_id: text(row.empresa_id), gestion: numeric(row.gestion), mes: numeric(row.mes),
    estado: text(row.estado), calculado_en: nullableText(row.calculado_en), aprobado_en: nullableText(row.aprobado_en) }
}

function parseDetalle(value: unknown) {
  const row = record(value)
  const tipo = text(row.tipo)
  if (!['INGRESO', 'DESCUENTO', 'PATRONAL'].includes(tipo)) throw new Error('La boleta incluye un tipo de concepto desconocido. Solicita su revisión antes de imprimir.')
  return { codigo: text(row.codigo), nombre: text(row.nombre), tipo, monto: decimal(row.monto) }
}

export function parseBoleta(value: unknown) {
  const row = record(value)
  return { id: text(row.id), periodo_id: text(row.periodo_id), empleado_id: text(row.empleado_id),
    dias_trabajados: numeric(row.dias_trabajados), salario_basico: decimal(row.salario_basico),
    total_ganado: decimal(row.total_ganado), total_descuentos: decimal(row.total_descuentos),
    liquido_pagable: decimal(row.liquido_pagable), total_aportes_patronales: decimal(row.total_aportes_patronales),
    detalle: list(row.detalle, parseDetalle) }
}

function parseResumen(value: unknown) {
  const row = record(value)
  return { id: text(row.id), empleado_id: text(row.empleado_id), liquido_pagable: decimal(row.liquido_pagable) }
}

function parseMiResumen(value: unknown) {
  const row = record(value)
  return { id: text(row.id), periodo_id: text(row.periodo_id), liquido_pagable: decimal(row.liquido_pagable) }
}

export type Periodo = ReturnType<typeof parsePeriodo>
export type Boleta = ReturnType<typeof parseBoleta>
export type ResumenBoleta = ReturnType<typeof parseResumen>
export type MiResumenBoleta = ReturnType<typeof parseMiResumen>

export async function getPeriodos(empresaId?: string | null) {
  return list(await apiRequest<GetResponse<'/api/v1/nomina/periodos'>>(`/api/v1/nomina/periodos${buildQuery({ empresa_id: empresaId })}`), parsePeriodo)
}

export async function getBoletasDePeriodo(periodoId: string, empresaId?: string | null) {
  return list(await apiRequest<GetResponse<'/api/v1/nomina/periodos/{periodo_id}/boletas'>>(
    `/api/v1/nomina/periodos/${encodeURIComponent(periodoId)}/boletas${buildQuery({ empresa_id: empresaId })}`,
  ), parseResumen)
}

export async function getBoleta(boletaId: string, empresaId?: string | null) {
  return parseBoleta(await apiRequest<GetResponse<'/api/v1/nomina/boletas/{boleta_id}'>>(
    `/api/v1/nomina/boletas/${encodeURIComponent(boletaId)}${buildQuery({ empresa_id: empresaId })}`,
  ))
}

export async function getMisBoletas() {
  return list(await apiRequest<GetResponse<'/api/v1/nomina/mi/boletas'>>('/api/v1/nomina/mi/boletas'), parseMiResumen)
}

export async function getMiBoleta(boletaId: string) {
  return parseBoleta(await apiRequest<GetResponse<'/api/v1/nomina/mi/boletas/{boleta_id}'>>(`/api/v1/nomina/mi/boletas/${encodeURIComponent(boletaId)}`))
}
