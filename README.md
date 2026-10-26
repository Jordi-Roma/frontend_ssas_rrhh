# Frontend SSAS RRHH

Aplicación React/TypeScript que consume exclusivamente la API de SSAS RRHH. El navegador no se
conecta a PostgreSQL ni contiene credenciales de Supabase.

## Configuración

Copiar `.env.example` a `.env` y definir:

```text
VITE_API_URL=https://backendssasrrhh-production.up.railway.app
```

## Ejecución

```bash
npm install
npm run dev
```

## Validación

```bash
npm run lint
npm run build
npm run check:api
```

`npm run build` verifica TypeScript antes de generar la aplicación.

## Contrato del backend

Los tipos de `src/shared/api/schema.d.ts` se generan desde el OpenAPI desplegado:

```bash
npm run generate:api
```

Swagger: https://backendssasrrhh-production.up.railway.app/docs

La arquitectura está documentada en [`docs/ARQUITECTURA_FRONTEND.md`](docs/ARQUITECTURA_FRONTEND.md).

## Sprint 3 de personal y nómina

- `/personal/contratos`: consulta del historial y registro de nuevas versiones de contrato.
- `/personal/ausencias/configuracion`: catálogo de tipos en solo lectura y asignación anual de
  vacaciones. CU-22 es parcial: faltan las operaciones de configuración de tipos y la lectura de
  saldos en el backend.
- `/nomina/boletas`: consulta por periodo para RRHH e impresión de boletas.
- `/nomina/mis-boletas`: consulta e impresión de boletas propias aprobadas. Los metadatos que no
  devuelve la API para el rol del empleado se muestran como referencias, sin inventar fechas ni
  información de empresa.

Los cuerpos de escritura utilizan el contrato OpenAPI generado. Las respuestas publicadas sin
esquema se validan al recibirlas. La impresión usa los totales del servidor y separa los aportes
del empleador de los descuentos del trabajador.

Ejecutar `npm test` para las pruebas de interfaz y API. Las capturas, la muestra de impresión y el
registro de la prueba de navegador están en [`artifacts/sprint3`](artifacts/sprint3). Usan datos
ficticios y solicitudes interceptadas; no acreditan escrituras en el backend real. La validación
integrada con una cuenta de pruebas sigue pendiente.

Para repetir la prueba visual, iniciar el frontend en `http://127.0.0.1:5173` y ejecutar
`node scripts/verify-sprint3.mjs`. Requiere Playwright disponible; `PLAYWRIGHT_MODULE_PATH` permite
utilizar una instalación existente y `BROWSER_PATH` seleccionar el navegador.
