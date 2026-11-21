# Frontend Sprint 4

## Pantallas entregadas

- **Capacitación → Cursos** (`/capacitacion/cursos`): catálogo por empresa, alta y edición de borradores, lecciones ordenadas, carga de PDF/MP4/PNG/JPG, cuestionarios con editor de preguntas y publicación. Los cursos publicados quedan de solo lectura. El gestor puede descargar el material protegido.
- **Capacitación → Asignación y seguimiento** (`/capacitacion/seguimiento`): asignación individual o por departamento con fecha límite opcional; avance, calificación, estado, aprobación y descarga de certificados. La asignación de departamento utiliza empleados activos con contrato vigente según el backend.
- **Análisis → Indicadores** (`/indicadores`): filtros de fechas y visualizaciones de rotación, ausentismo, tiempo de contratación, personal por departamento y embudo de reclutamiento. Los datos se leen exclusivamente de la empresa activa.
- **Análisis → Reportes** (`/reportes`): exportación CSV añadida a las opciones existentes del constructor de reportes avanzados.

Las tres pantallas nuevas muestran estados de carga, vacío y error. Sus rutas y acciones están condicionadas por permisos del backend. No incluyen datos simulados.

## Dependencias para usarlo en producción

1. Integrar y desplegar el backend del Sprint 4, incluida la migración `20261117_0015_capacitacion`.
2. Asignar los nuevos permisos a los roles pertinentes y volver a iniciar sesión para renovar la lista de permisos del usuario.
3. Configurar `CAPACITACION_FILES_DIRECTORY` en almacenamiento persistente del backend para conservar los materiales subidos tras un reinicio o despliegue.
4. Desplegar este frontend después del backend. Hasta entonces, las nuevas rutas responderán con error porque la API de producción todavía no las ofrece.

## Verificación local

`npm run build`, `npm run lint` y `npm test`. Pruebas nuevas: creación y publicación de cursos, asignación por departamento, indicadores con datos, filtros y error de consulta. La ejecución local no sustituye una prueba de pantalla contra el backend desplegado.
