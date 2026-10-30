# Sprint 2: frontend

Repositorio: C:/Users/JORDI/Documentos/RRHH/FRONTEND_SSAS_RRHH.
Alcance exclusivo frontend. Sin push ni despliegue.

## Pantallas conectadas

- T2-11: /entrevistas. API real, UUID, empresa activa, filtros estado/fechas, paginacion offset/limit, programar, reprogramar, confirmar y cancelar.
- T2-12: resultados de entrevista y evaluaciones desde la agenda y el detalle. Puntaje/maximo, dictamen explicito, observaciones, responsable, correccion y errores por campo. Plataforma designa evaluador tenant; una correccion conserva el original.
- T2-13: /seleccion y /vacantes/:id/seleccion. Ranking paginado por IA/manual/entrevistas/evaluaciones, busqueda por nombre y estado. Analisis/reanalisis desde detalle, historial de resultados, resumen, habilidades, fortalezas, experiencia y fecha/modelo. Un fallo conserva el resultado previo. Analisis timeout 100 segundos; sin resultado ficticio.
- T2-14: comparacion de 2 a 4 candidatos de la misma vacante mediante API, conservando seleccion al cerrar. Requisitos desde vacante; resumen desde analisis. Faltantes muestran sin informacion; puntajes nulos no se convierten a cero.
- T2-15: contratar desde ficha mediante permiso especifico. Codigo validado, apellidos, CI expedido y fecha. Sin doble envio; empleado retornado visible, luego refresco de tablero/ranking.
- T2-16: banco de talento con busqueda, inclusion/exclusion, habilidad, experiencia, alta manual y asociacion a vacante publicada sin duplicar perfil. Inclusion desde ficha conserva CV.
- T2-17: historial unificado /postulaciones/{id}/historial; errores visibles y separados de un historial vacio. Refresco tras analisis/evaluaciones/resultados.

## Contrato e aislamiento

Cliente compartido apiRequest; sin cliente alternativo ni datos simulados en la aplicacion.
Todas las solicitudes nuevas propagan empresa_id. Pantallas y formularios se desmontan al cambiar empresa; efectos ignoran respuestas tardias. Modulo RECLUTAMIENTO y permisos tenant/plataforma mediante guardas existentes. Ordenes de entrevistas/evaluaciones disponibles solo con permiso de consulta correspondiente.

Agenda/ranking: offset/limit. Fechas: desde/hasta con zona UTC, visualizacion local. Ranking: orden ia|manual|entrevistas|evaluaciones. La busqueda por nombre recorre paginas reales de ranking y pagina el conjunto filtrado porque la ruta no admite busqueda; costo proporcional al numero de candidatos. El listado de talento no retorna total; se solicita una fila adicional para determinar Siguiente sin inventar un total.

Decimal de entrevista/evaluacion/analisis normalizado a Number en la frontera API; ranking numerico. GET analisis devuelve resultados mas recientes primero. Plataforma usa evaluador_id opcional del contrato y no reemplaza el responsable en correcciones.

## Validacion

- npm run build: aprobado antes y despues de integracion inicial.
- npm run lint: aprobado. La configuracion existente inspecciona JavaScript; TypeScript se verifica por tsc durante build.
- Nuevas pruebas: contrato HTTP (13), formulario evaluacion (3), aislamiento/seleccion/comparacion/permisos (3), formulario entrevistas HTTPS/UUID/zona/empresa (2).
- npm run test: 42 pruebas aprobadas en 6 archivos; 22 pruebas nuevas de Sprint 2. Incluye foco/Tab/Escape de dialogos anidados de evaluaciones. Sin fallos ni advertencias React en la ultima ejecucion.
- npm run check:api con OPENAPI_URL=http://127.0.0.1:8012/openapi.json: aprobado despues de regenerar los tipos desde el backend local actualizado.
- Verificacion Playwright contra backend local 8012 y frontend 5176: entrevistas, seleccion y postulantes a 1440 y 390 px, las 6 visitas sin errores de API, sin 404, sin desbordamiento de documento. A 390 px scrollWidth=390 en las tres rutas y tablas con scroll interno en contenedores de 358 px.
- Capturas finales: C:/Users/JORDI/Downloads/O2222/OneDrive/Documentos/ChatGPT/RRHH/tmp/sprint2-responsive-final/{1440,390}-{entrevistas,seleccion,postulantes}.png; resultados numericos en results.json. Regeneracion OpenAPI coordinada con agente principal.

OPENAPI_URL permite elegir backend local o archivo exportado para generate:api y check:api. Ambos scripts usan el mismo backend predeterminado. Para la integracion local, PowerShell: `$env:OPENAPI_URL='http://127.0.0.1:8012/openapi.json'`; luego `npm run generate:api` y `npm run check:api`.

## Pendientes externos

El agente principal verifico el flujo web completo local: programacion, comparacion, evaluacion y contratacion con empleado creado. Capturas adicionales de formularios y comparador en desktop/movil en tmp/sprint2-screenshots. La prueba de IA con credenciales reales y la verificacion de Railway siguen pendientes. No se declaran actos Scrum realizados.

Ajustes finales verificados: filtros usan toolbar responsive existente; shell/sidebar/page-stack min-width:0 y tracks minmax(0,1fr); tablas contenidas con overflow propio; enlaces de navegacion movil distribuidos en filas. URL /seleccion?vacante=UUID compatible con el ranking. Entrevistas virtuales requieren HTTPS. Evaluadores de plataforma provienen de GET /evaluaciones/opciones con permiso evaluaciones:gestionar y empresa_id.

## Archivos modificados

- src/app/access/navigation.ts; src/app/router/AppRouter.tsx.
- src/features/entrevistas/api/entrevistasApi.ts; components/EntrevistaForm.tsx; components/EntrevistaForm.test.tsx; components/ResultadoForm.tsx; pages/EntrevistasPage.tsx.
- src/features/seleccion/api/seleccionApi.ts; api/seleccionApi.test.ts; components/SeleccionCandidato.tsx; components/EvaluacionForm.tsx; components/EvaluacionForm.test.tsx; components/BancoTalentoAction.tsx; pages/SeleccionPage.tsx; pages/SeleccionPage.test.tsx; seleccion.css.
- src/features/postulantes/api/postulantesApi.ts; pages/PostulantesPage.tsx.
- src/features/tablero/api/tableroApi.ts; components/PostulanteDetalleModal.tsx; components/ContratarPostulanteModal.tsx; components/HistorialPostulante.tsx; components/TableroKanban.tsx; pages/TableroPage.tsx.
- package.json; scripts/generate-api.mjs; scripts/check-api-contract.mjs; este reporte.
- src/shared/styles/components.css; src/shared/styles/layout.css.
- src/shared/components/Modal.tsx; Modal.test.tsx; src/shared/api/schema.d.ts regenerado.
