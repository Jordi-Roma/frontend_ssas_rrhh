/** Verificación visual contra el servidor local con HTTP interceptado y datos ficticios.
 * Nunca inicia sesión ni escribe en la API real. PLAYWRIGHT_MODULE_PATH permite usar
 * Playwright ya instalado en el equipo sin añadirlo a las dependencias del producto. */
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH ?? 'playwright')
const source = readFileSync(new URL('../src/test/sprint3Fixtures.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
const { empleado, cargo, departamento, empresa, contrato, periodo, boleta } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
const output = resolve('artifacts/sprint3')
mkdirSync(output, { recursive: true })
const executablePath = process.env.BROWSER_PATH ?? [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
].find(path => existsSync(path))
const browser = await chromium.launch({ headless: true, executablePath })
const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, locale: 'es-BO' })
const page = await context.newPage()
const base = process.env.SPRINT3_BASE_URL ?? 'http://127.0.0.1:5173'
if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(base).hostname)) throw new Error('La verificación requiere un servidor local.')
let scenario = ''
let created = false
let restricted = false
const unexpected = []
const errors = []
const checks = []
const requests = []
const permissions = ['personal:ver', 'personal:gestionar', 'ausencias:mi', 'ausencias:gestionar', 'boletas:ver', 'boletas:mi', 'nomina:ver', 'empleados:ver', 'cargos:ver', 'departamentos:ver', 'empresa:ver']
page.on('pageerror', error => errors.push(error.message))
await context.addInitScript(() => sessionStorage.setItem('ssas.session.v1', JSON.stringify({ access_token: 'demo-no-real', refresh_token: 'demo-no-real', realm: 'tenant' })))
await context.route('**/*', async route => {
  const request = route.request()
  const url = new URL(request.url())
  const path = url.pathname
  if (!path.startsWith('/api/v1/')) {
    if (url.origin === new URL(base).origin) return route.continue()
    return route.abort()
  }
  requests.push({ path, method: request.method() })
  const send = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
  if (path === '/api/v1/auth/refresh') return send({ access_token: 'demo-no-real', refresh_token: 'demo-no-real', token_type: 'bearer' })
  if (path === '/api/v1/auth/me') return send({ id: 'demo-user', name: 'Lucía Demo Ejemplo', email: 'demo@example.invalid', empresa_id: empresa.id, roles: ['DEMO'], permissions: restricted ? ['boletas:mi'] : permissions, modulos: [], is_active: true, email_verified: true })
  if (path === `/api/v1/empresas/${empresa.id}`) return restricted ? send({ detail: 'Consulta de empresa no autorizada' }, 403) : send(empresa)
  if (path === '/api/v1/chatbot/sugerencias') return send([])
  if (path === '/api/v1/empleados') return send(scenario === 'ausencias-vacio' ? [] : [empleado])
  if (path === `/api/v1/empleados/${empleado.id}`) return send(empleado)
  if (path === '/api/v1/cargos') return send([cargo])
  if (path === '/api/v1/departamentos') return send([departamento])
  if (path.endsWith('/contratos')) {
    if (request.method() === 'POST') {
      if (scenario === 'contratos-error') return send({ detail: 'La nueva version debe comenzar despues de la anterior' }, 409)
      created = true
      return send({ ...contrato, id: 'contrato-nuevo-demo', ...request.postDataJSON(), estado: 'VIGENTE' }, 201)
    }
    if (scenario === 'contratos-vacio') return send([])
    if (created) return send([{ ...contrato, id: 'contrato-nuevo-demo', numero_contrato: 'CT-DEMO-02', fecha_inicio: '2026-12-01' }, { ...contrato, estado: 'REEMPLAZADO', fecha_fin: '2026-11-30' }])
    return send([contrato, { ...contrato, id: 'anterior-demo', numero_contrato: 'CT-DEMO-INICIAL', estado: 'REEMPLAZADO', fecha_inicio: '2026-01-15', fecha_fin: '2026-09-30', salario_basico: '8000.00', motivo_cambio: 'Contrato inicial de demostración' }])
  }
  if (path === '/api/v1/personal/tipos-ausencia') return send(scenario === 'ausencias-vacio' ? [] : [
    { id: 'vacaciones-demo', codigo: 'VAC', nombre: 'Vacaciones', es_remunerado: true, descuenta_vacacion: true },
    { id: 'licencia-demo', codigo: 'LIC', nombre: 'Licencia sin goce de haberes', es_remunerado: false, descuenta_vacacion: false },
  ])
  if (path.includes('/vacaciones/')) {
    assert.equal(request.method(), 'PUT', 'El saldo nunca se lee mediante escritura')
    if (scenario === 'ausencias-error') return send({ detail: 'No se puede reducir el saldo por debajo de lo ya utilizado' }, 409)
    const data = request.postDataJSON()
    assert.ok(path.endsWith(`/${data.gestion}`), 'La gestión coincide en ruta y cuerpo')
    return send({ ...data, dias_usados: 4 })
  }
  if (path === '/api/v1/nomina/periodos') return send([periodo])
  if (path === `/api/v1/nomina/periodos/${periodo.id}/boletas`) return send(scenario === 'boletas-vacio' ? [] : [{ id: boleta.id, empleado_id: empleado.id, liquido_pagable: boleta.liquido_pagable }])
  if (path === '/api/v1/nomina/mi/boletas') return send([{ id: boleta.id, periodo_id: periodo.id, liquido_pagable: boleta.liquido_pagable }])
  if (path === `/api/v1/nomina/boletas/${boleta.id}` || path === `/api/v1/nomina/mi/boletas/${boleta.id}`) return scenario === 'boletas-error' ? send({ detail: 'No tienes permiso para consultar esta boleta' }, 403) : send(boleta)
  unexpected.push(`${request.method()} ${path}`)
  return send({ detail: 'Ruta no prevista por la prueba local' }, 501)
})

async function open(path, state) { scenario = state; await page.goto(`${base}${path}`); await page.getByRole('heading', { level: 1 }).waitFor() }
async function shot(name) { await page.screenshot({ path: resolve(output, `${name}.png`), fullPage: true }) }
async function employee() { await page.getByRole('option', { name: /EMP-DEMO-01/ }).waitFor({ state: 'attached' }); await page.getByRole('combobox', { name: /^Empleado/ }).selectOption(empleado.id) }
async function selectPeriod() { await page.getByRole('option', { name: /octubre de 2026/ }).waitFor({ state: 'attached' }); await page.getByRole('combobox', { name: /^Periodo/ }).selectOption(periodo.id) }

try {
  await open('/personal/contratos', 'contratos-vacio'); await employee()
  await page.getByText('Este empleado todavía no tiene contratos registrados').waitFor(); await shot('CU21-vacio')
  await open('/personal/contratos', 'contratos-datos'); await employee()
  await page.getByText('Contrato vigente', { exact: true }).waitFor(); await shot('CU21-datos')
  await page.getByRole('button', { name: 'Nueva versión' }).click()
  await page.getByLabel('N.º de contrato', { exact: true }).fill('CT-DEMO-02')
  await page.getByLabel('Fecha de inicio', { exact: true }).fill('2026-12-01')
  scenario = 'contratos-error'
  await page.getByRole('button', { name: 'Registrar versión' }).click()
  await page.getByText('La nueva version debe comenzar despues de la anterior', { exact: true }).waitFor()
  assert.equal(await page.getByLabel('N.º de contrato', { exact: true }).inputValue(), 'CT-DEMO-02')
  await shot('CU21-error')
  scenario = 'contratos-guardar'; await page.getByRole('button', { name: 'Registrar versión' }).click()
  await page.getByText('Versión registrada.', { exact: false }).waitFor()
  await page.getByText('REEMPLAZADO', { exact: true }).waitFor()
  checks.push('CU21: vacío, datos, conflicto sin pérdida y recarga tras alta')

  await open('/personal/ausencias/configuracion', 'ausencias-vacio')
  await page.getByText('No hay tipos de ausencia activos para esta empresa.').waitFor(); await shot('CU22-vacio')
  await open('/personal/ausencias/configuracion', 'ausencias-datos'); await employee()
  await page.getByLabel('Gestión', { exact: true }).fill('2026'); await page.getByLabel('Días asignados', { exact: true }).fill('15')
  await page.getByRole('button', { name: 'Asignar saldo' }).click(); await page.getByText('Disponibles', { exact: true }).waitFor()
  await shot('CU22-datos')
  scenario = 'ausencias-error'; await page.getByLabel('Días asignados', { exact: true }).fill('2')
  await page.getByRole('button', { name: 'Asignar saldo' }).click()
  await page.getByText('No se puede reducir el saldo por debajo de lo ya utilizado', { exact: false }).waitFor()
  assert.equal(await page.getByLabel('Días asignados', { exact: true }).inputValue(), '2'); await shot('CU22-error')
  checks.push('CU22: catálogo vacío, asignación confirmada y 409 conservando valores')

  await open('/nomina/boletas', 'boletas-vacio'); await selectPeriod()
  await page.getByText('No hay boletas para este periodo.').waitFor(); await shot('CU27-vacio')
  await open('/nomina/boletas', 'boletas-datos'); await selectPeriod()
  await page.getByRole('button', { name: 'Ver boleta' }).click(); await page.getByRole('article', { name: 'Boleta de pago' }).waitFor()
  await shot('CU27-datos')
  await page.emulateMedia({ media: 'print' })
  assert.equal(await page.locator('.payslip-signatures').evaluate(element => getComputedStyle(element).display), 'grid')
  assert.equal(await page.locator('#root').evaluate(element => getComputedStyle(element).display), 'none')
  assert.equal(await page.locator('.payslip').evaluate(element => getComputedStyle(element).display), 'block')
  assert.equal(await page.locator('.payslip-overlay .modal-footer').evaluate(element => getComputedStyle(element).display), 'none')
  await page.pdf({ path: resolve(output, 'CU27-impresion.pdf'), printBackground: true, preferCSSPageSize: true })
  await page.emulateMedia({ media: 'screen' })
  await page.locator('.modal-footer').getByRole('button', { name: 'Cerrar', exact: true }).click()
  scenario = 'boletas-error'; await page.getByRole('button', { name: 'Ver boleta' }).click()
  await page.getByText('No tienes permiso para consultar esta boleta').waitFor(); await shot('CU27-error')
  checks.push('CU27: vacío, detalle, error 403 e impresión A4 con firmas sin navegación')

  restricted = true
  const ownRequestStart = requests.length
  await open('/nomina/mis-boletas', 'mis-boletas')
  await page.getByRole('button', { name: 'Ver boleta' }).click(); await page.getByRole('article', { name: 'Boleta de pago' }).waitFor()
  await page.getByText('APROBADO', { exact: true }).waitFor()
  assert.ok(!requests.slice(ownRequestStart).some(request => request.path === '/api/v1/nomina/periodos'))
  assert.equal(await page.getByRole('button', { name: 'Imprimir' }).isEnabled(), true)
  await shot('CU27-mis-boletas-permiso-minimo')
  checks.push('Empleado: endpoints propios e impresión accesibles solo con boletas:mi')

  await page.locator('.modal-footer').getByRole('button', { name: 'Cerrar', exact: true }).click()
  restricted = false
  await page.setViewportSize({ width: 390, height: 844 })
  await open('/personal/contratos', 'contratos-datos'); await employee(); await page.getByText('Contrato vigente', { exact: true }).waitFor()
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'Sin desbordamiento horizontal en móvil')
  await shot('CU21-movil')
  checks.push('Móvil 390px: contratos sin desbordamiento horizontal')
  assert.deepEqual(unexpected, [], 'Todas las rutas de prueba están interceptadas')
  assert.deepEqual(errors, [], 'Sin errores de JavaScript en el navegador')
  writeFileSync(resolve(output, 'verificacion.json'), JSON.stringify({ date: new Date().toISOString(), environment: 'API interceptada; datos ficticios; sin escrituras reales', checks, unexpected, errors }, null, 2))
  console.log(JSON.stringify({ output, checks, screenshots: 11, pdf: 'CU27-impresion.pdf' }, null, 2))
} finally { await browser.close() }
