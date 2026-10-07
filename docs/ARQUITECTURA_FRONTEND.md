# Arquitectura del frontend SSAS RRHH

## Decisión
 
El frontend usa **Vertical Slicing** y **Screaming Architecture** con una aplicación React
organizada por funcionalidades. Clean Architecture se aplica de forma pragmática: no se crea una
capa `domain` o `application` hasta que existan reglas propias del cliente que la justifiquen.

## Estructura

```text
src/
├── app/                 Composición, providers globales y rutas
├── features/
│   ├── auth/            Autenticación completa y autocontenida
│   ├── bitacora/        Consulta de auditoría
│   ├── empresas/        Administración global de empresas
│   ├── roles/           Roles y permisos
│   └── usuarios/        Administración de usuarios
├── shared/              Código reutilizable y sin conocimiento del negocio
└── main.tsx             Punto de entrada
```

Cada feature incorpora `api/`, `components/`, `hooks/`, `pages/`, `providers/` o `storage/`
cuando los necesita. No es obligatorio crear todas esas carpetas.

## Reglas de dependencia

1. `app` puede importar `features` y `shared` porque compone la aplicación.
2. Una `feature` puede importar `shared`, pero no otra feature.
3. `shared` no importa desde `features` ni desde `app`.
4. Las páginas orquestan; los componentes presentan; `api` conoce HTTP.
5. Un contrato del backend se representa una sola vez, cerca de la feature que lo usa.
6. `domain/` se agrega para reglas puras, entidades con comportamiento o value objects.
7. `application/` se agrega cuando un flujo coordina varias fuentes o reglas; una llamada HTTP
   directa no merece por sí sola un caso de uso.

## Flujo de los datos

```text
Página o formulario → API de la feature → httpClient → endpoints /api/v1 → Backend → Supabase
```

El navegador nunca se conecta directamente a Supabase y no contiene su URL, contraseña ni claves.
Solo conoce `VITE_API_URL`, que apunta al backend. El backend valida la sesión, aplica las reglas de
negocio y es el único responsable de acceder a la base de datos.

La URL se configura en `.env`:

```dotenv
VITE_API_URL=https://backendssasrrhh-production.up.railway.app
```

Los contratos TypeScript de `shared/api/schema.d.ts` se generan desde el OpenAPI del backend con
`npm run generate:api`. Así, los formularios y respuestas siguen el contrato publicado y no se
mantienen DTO duplicados manualmente.

## Cómo agregar una feature

Ejemplo: agregar el módulo `vacaciones`.

1. Crear `src/features/vacaciones/`.
2. Agregar `api/vacacionesApi.ts` con funciones pequeñas que llamen a `apiRequest` usando rutas
   `/api/v1/...`.
3. Agregar `pages/VacacionesPage.tsx` para cargar el estado y coordinar la pantalla.
4. Crear `components/` solo si hay formularios o piezas visuales reutilizables dentro del módulo.
5. Registrar la página en `app/router/AppRouter.tsx` y protegerla con el ámbito correcto:
   `tenant` para una empresa o `platform` para la administración global.
6. Agregar el enlace en `app/layouts/AppLayout.tsx`.
7. Regenerar los contratos, ejecutar `npm run build` y `npm run lint`.

No se crean repositorios de base de datos, migraciones ni clientes de Supabase en el frontend.
Tampoco se agregan carpetas vacías de `domain`, `application` o `infrastructure`: se crean cuando
aparece una necesidad real, no por obligación estructural.

## Autenticación

Existen dos ámbitos separados:

- `tenant`: usuarios de una empresa; el login requiere empresa, usuario/correo y contraseña.
- `platform`: administradores globales; el login requiere identificador y contraseña.

Ambos ámbitos usan `/api/v1/auth/login`. La presencia de `empresa_slug` selecciona una empresa; su
ausencia selecciona la administración global. Después, `/api/v1/auth/me` confirma el ámbito real
mediante `empresa_id`. La sesión se conserva en `sessionStorage` y se elimina al cerrar la pestaña o
cerrar sesión. Las rutas impiden que un usuario de empresa abra pantallas de plataforma y viceversa.

## CORS y despliegue

El backend debe incluir cada origen desde el que se ejecutará el frontend. Para desarrollo debe
aceptar `http://localhost:5173`; en producción debe aceptar también el dominio público del frontend.
En Railway se configura `APP_CORS_ORIGINS` con ambos orígenes separados por coma y
`APP_FRONTEND_URL` con el dominio público del frontend. Esta autorización pertenece al backend,
no a React.

## Por qué no se replica el backend

El backend protege reglas de negocio y necesita puertos, repositorios y casos de uso. La mayor parte
del frontend transforma interacciones en solicitudes HTTP. Duplicar `User`, DTOs y un caso de uso
por endpoint crea mantenimiento doble sin aumentar el aislamiento.

## Crecimiento

Un módulo se crea al ingresar su primera historia de usuario. Si una feature crece, se divide
internamente por flujo. El código se mueve a `shared` solo cuando existen al menos dos consumidores.
