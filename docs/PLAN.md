# Plan de desarrollo – Plantilla de Portafolio Académico

Stack: **React + Vite** (frontend) · **Vercel Functions en `/api`** (backend) · **Neon Postgres** (datos) · **bucket S3-compatible** (PDF/imágenes).
Todo vive en este repositorio y se publica con **un solo despliegue en Vercel**.

---

## 1. Arquitectura

```
Navegador (React SPA)
   │  fetch('/api/...')  (cookie httpOnly con JWT)
   ▼
Vercel Functions (/api/*.js)  ──►  Neon Postgres (DATABASE_URL)
   │
   └─► genera URL firmada ──►  el navegador sube el archivo DIRECTO al bucket
```

**Decisiones clave**

| Tema | Decisión | Motivo |
|---|---|---|
| URL pública | `/p/:slug` (ej. `/p/juan-perez`) | No choca con `/login`, `/admin`, `/dashboard` |
| Edición | `/p/:slug/editar` | Solo el dueño del portafolio (se valida en el servidor) |
| Sesión | JWT en cookie `httpOnly`, `Secure`, `SameSite=Lax` | No accesible desde JS |
| Contraseñas | `bcryptjs` | Compatible con el hash del `seed_admin.sql` |
| Subida de archivos | URL prefirmada → subida directa al bucket | Vercel limita el cuerpo de la petición a ~4.5 MB |
| Nº de funciones | Pocas funciones con enrutador interno | El plan Hobby de Vercel limita el número de funciones |
| Límite de portafolios | `users.max_portfolios` (3 por defecto) + trigger en BD | Aplicado aunque falle la validación de la API |

**Roles**
- `student`: crea/edita/elimina **sus** portafolios (máx. 3), apartados, parciales y publicaciones.
- `admin`: crea usuarios, activa/desactiva usuarios, bloquea/desbloquea portafolios, ve cualquier portafolio (incluso bloqueado) y lo elimina.

**Regla de oro de seguridad:** toda ruta de escritura comprueba en el servidor que
`portfolio.owner_id === usuarioDeLaSesion.id` (o que el rol es `admin` en rutas de admin).
Nunca confiar en lo que el frontend diga sobre la propiedad.

---

## 2. Estructura de carpetas

```
PlantillaPortafolio/
├── api/                        # Vercel Functions (backend)
│   ├── _lib/                   # Código compartido (el "_" evita que Vercel lo trate como ruta)
│   │   ├── db.js               # Cliente Neon (@neondatabase/serverless)
│   │   ├── auth.js             # Firmar/verificar JWT, leer cookie, requireUser/requireAdmin
│   │   ├── storage.js          # URLs prefirmadas y borrado en el bucket
│   │   ├── http.js             # Respuestas JSON, manejo de errores, método permitido
│   │   ├── ownership.js        # ¿Este recurso pertenece a este usuario?
│   │   └── validators/         # Validación de entradas (zod)
│   ├── auth.js                 # /api/auth?action=login|logout|me
│   ├── public.js               # /api/public?slug=...  (lectura pública del portafolio)
│   ├── portfolios.js           # CRUD de portafolios del usuario
│   ├── content.js              # CRUD apartados / parciales / publicaciones / orden
│   ├── files.js                # Pedir URL de subida, registrar y borrar archivos
│   └── admin.js                # Usuarios y moderación de portafolios
├── database/
│   ├── schema.sql              # Tablas, tipos, triggers, vista e índices
│   └── seed_admin.sql          # Primer administrador
├── docs/
│   └── PLAN.md                 # Este documento
├── public/                     # Estáticos
├── src/
│   ├── components/
│   │   ├── layout/             # Navbar, Footer, Layout público, Layout de panel
│   │   ├── ui/                 # Button, Input, Modal, Spinner, ConfirmDialog, Toast
│   │   ├── portfolio/          # Vista pública: menú, apartado, parcial, tarjeta de publicación, visor PDF/imagen
│   │   ├── editor/             # Formularios y controles de edición
│   │   └── admin/              # Tablas y acciones de administración
│   ├── pages/
│   │   ├── public/             # Home, PortfolioPage, NotFound, PortfolioBlocked
│   │   ├── auth/               # Login
│   │   ├── dashboard/          # "Mis portafolios" (lista, crear, eliminar)
│   │   ├── editor/             # Editor de un portafolio
│   │   └── admin/              # Usuarios, Portafolios, Bitácora
│   ├── context/                # AuthContext (usuario de la sesión)
│   ├── hooks/                  # useAuth, usePortfolio, useUpload...
│   ├── services/               # Llamadas a /api (apiClient + un archivo por recurso)
│   ├── routes/                 # Definición de rutas y guards (ProtectedRoute, AdminRoute, OwnerRoute)
│   ├── utils/                  # slugify, formatBytes, fechas, validaciones de archivo
│   ├── styles/                 # Variables CSS / temas de la plantilla
│   ├── App.jsx
│   └── main.jsx
├── .env.example
├── vercel.json                 # (se crea en el paso 2) rewrites del SPA
└── package.json
```

---

## 3. Rutas

### Frontend (React Router)
| Ruta | Acceso | Página |
|---|---|---|
| `/` | público | Inicio / presentación |
| `/login` | público | Inicio de sesión (`?next=/p/slug/editar`) |
| `/p/:slug` | público | Portafolio (menú → apartados → parciales → publicaciones) |
| `/p/:slug/:seccion` | público | Apartado concreto |
| `/p/:slug/editar` | dueño | Modo edición |
| `/dashboard` | logueado | Mis portafolios (máx. 3) |
| `/admin/usuarios` | admin | Crear / activar / desactivar usuarios |
| `/admin/portafolios` | admin | Ver, bloquear, desbloquear, eliminar |
| `/admin/bitacora` | admin | Historial de acciones |

> Flujo "según el enlace": en `/p/:slug` hay un botón **Editar**. Si no hay sesión → `/login?next=/p/:slug/editar`.
> Al volver, el servidor comprueba que el usuario sea el dueño; si no lo es → 403 "Este portafolio no es tuyo".

### API (resumen)
| Método | Endpoint | Quién |
|---|---|---|
| POST | `/api/auth?action=login` | público |
| POST | `/api/auth?action=logout` | logueado |
| GET | `/api/auth?action=me` | logueado |
| GET | `/api/public?slug=` | público (404 si bloqueado o no existe) |
| GET/POST/PATCH/DELETE | `/api/portfolios` | dueño |
| GET/POST/PATCH/DELETE | `/api/content?type=section\|subsection\|post` | dueño |
| PATCH | `/api/content?type=...&action=reorder` | dueño |
| POST | `/api/files?action=presign` | dueño |
| POST/DELETE | `/api/files` | dueño |
| GET/POST/PATCH | `/api/admin?resource=users` | admin |
| GET/PATCH/DELETE | `/api/admin?resource=portfolios` | admin |
| GET | `/api/admin?resource=actions` | admin |

---

## 4. Plan paso a paso (1 paso ≈ 1 commit)

Cada paso termina con algo que se puede probar. Sugerencia de mensaje de commit entre comillas.

### Fase 0 – Base
**Paso 1 – Proyecto base** ✅ *(ya generado)*
- Vite + React, carpetas, `.env.example`, `database/schema.sql`, `database/seed_admin.sql`, este plan.
- `chore: estructura inicial del proyecto, esquema de BD y plan`

**Paso 2 – Configuración de Vercel y dependencias** ✅
- `npm i react-router-dom @neondatabase/serverless bcryptjs jsonwebtoken cookie zod`
- `npm i -D vercel` (para `vercel dev`, que levanta Vite + `/api` juntos en local).
- `vercel.json` con rewrite de todo lo que no sea `/api/*` a `/index.html`.
- Limpiar el contenido de ejemplo de Vite.
- `chore: configurar vercel, dependencias y limpiar plantilla`

**Paso 3 – Base de datos en Neon** ✅
- Crear proyecto en Neon → ejecutar `schema.sql` y luego `seed_admin.sql` (cambiar credenciales).
- Configurar `DATABASE_URL` en `.env` y en Vercel.
- `api/_lib/db.js` + endpoint temporal de salud (`SELECT 1`).
- `feat(api): conexión a Neon`

### Fase 1 – Autenticación
**Paso 4 – API de autenticación** ✅
- `_lib/auth.js` (JWT en cookie), `_lib/http.js`, `api/auth.js` (login, logout, me).
- Rechazar login si `is_active = false`; actualizar `last_login_at`.
- `feat(api): login, logout y sesión con JWT en cookie`

**Paso 5 – Login en el frontend** ✅
- `AuthContext`, `useAuth`, `services/apiClient.js`, página `/login`, redirección con `?next=`.
- Guards: `ProtectedRoute`, `AdminRoute`.
- `feat(web): página de login y contexto de sesión`

### Fase 2 – Portafolios
**Paso 6 – API de portafolios** ✅
- Listar los míos, crear (validar slug único y límite → error claro con `PORTFOLIO_LIMIT_REACHED`), editar datos generales, eliminar (borrar primero archivos del bucket con `portfolio_storage_keys`).
- `feat(api): CRUD de portafolios con límite por usuario`

**Paso 7 – Dashboard "Mis portafolios"** ✅
- Lista, contador "2 de 3", crear, eliminar con confirmación, enlace público y botón editar.
- `feat(web): dashboard de portafolios del estudiante`

**Paso 8 – Vista pública** ✅
- `api/public.js` devuelve el árbol completo (portafolio → apartados → parciales → publicaciones → archivos) en una sola consulta.
- Página `/p/:slug` con menú de navegación, pantalla 404 y "portafolio no disponible".
- `feat: vista pública del portafolio`

### Fase 3 – Contenido (modo edición)
**Paso 9 – Apartados del menú** ✅
- API y UI: crear, renombrar, eliminar (con confirmación), reordenar.
- Reservar el slug de apartado `editar` (choca con la ruta `/p/:slug/editar`).
- `feat: gestión de apartados del menú`

**Paso 10 – Submódulos (parciales)** ✅
- Crear "Parcial 1", "Parcial 2"..., renombrar, eliminar, reordenar.
- `feat: gestión de submódulos/parciales`

**Paso 11 – Publicaciones (sin archivos)** ✅
- Título obligatorio, descripción opcional; crear, editar, eliminar, reordenar.
- `feat: publicaciones dentro de cada parcial`

### Fase 4 – Archivos
**Paso 12 – Bucket** ✅
- Crear bucket, configurar CORS (permitir `PUT` desde tu dominio de Vercel y `localhost`), variables `STORAGE_*`.
- `_lib/storage.js`: URL prefirmada de subida, URL de lectura, borrado.
- `feat(api): integración con el bucket de archivos`

**Paso 13 – Subida de PDF/imágenes** ✅
- Flujo: `presign` → `PUT` directo al bucket con barra de progreso → registrar en `post_files`.
- Validar tipo (PDF, JPG, PNG, WEBP, GIF) y tamaño en cliente **y** servidor. Clave: `portfolios/{portfolioId}/{postId}/{uuid}-{nombre}`.
- Eliminar archivo = borrar del bucket + borrar fila.
- `feat: subida y eliminación de archivos en publicaciones`

**Paso 14 – Visor de archivos** ✅
- Imágenes en galería/lightbox; PDF embebido (`<iframe>`/`<object>`) con opción de descargar/abrir.
- `feat(web): visor de PDF e imágenes`

### Fase 5 – Administración
**Paso 15 – Gestión de usuarios (admin)** ✅
- Crear usuario (email, nombre, contraseña temporal, rol), listar, activar/desactivar, cambiar `max_portfolios`, restablecer contraseña. Registrar en `admin_actions`.
- `feat(admin): gestión de usuarios`

**Paso 16 – Moderación de portafolios (admin)**
- Listar todos (filtro por estado/dueño), ver contenido aunque esté bloqueado, bloquear con motivo, desbloquear, eliminar (limpiando el bucket).
- `feat(admin): bloquear, desbloquear y eliminar portafolios`

**Paso 17 – Bitácora**
- Página `/admin/bitacora` leyendo `admin_actions`.
- `feat(admin): bitácora de acciones`

### Fase 6 – Pulido y despliegue
**Paso 18 – Diseño de la plantilla**
- Tema visual, responsive, `theme` (jsonb) para colores por portafolio, estados de carga y vacíos.
- `style: diseño responsive de la plantilla`

**Paso 19 – Seguridad y robustez**
- Rate limit básico en login, mensajes de error genéricos, cabeceras de seguridad en `vercel.json`, revisar que **todas** las rutas de escritura validen propiedad, cambio de contraseña del propio usuario.
- `fix: endurecer seguridad de la API`

**Paso 20 – Despliegue en Vercel**
- Importar repo, variables de entorno, probar flujo completo en producción, README con instrucciones.
- `docs: guía de despliegue`

---

## 5. Base de datos (resumen)

| Tabla | Propósito |
|---|---|
| `users` | Cuentas; `role` (admin/student), `is_active`, `max_portfolios` (3) |
| `portfolios` | `slug` único (URL), `owner_id`, `status` (active/blocked), `theme` |
| `sections` | Apartados del menú, con `position` para ordenar |
| `subsections` | Parciales dentro de un apartado |
| `posts` | Publicación: título + descripción opcional |
| `post_files` | Uno o varios PDF/imágenes por publicación (`storage_key`, `url`) |
| `admin_actions` | Bitácora de acciones del admin |
| vista `public_portfolios` | Solo portafolios activos de usuarios activos |
| fn `portfolio_storage_keys()` | Claves del bucket a borrar antes de eliminar un portafolio |

Borrado en cascada: eliminar un portafolio elimina sus apartados, parciales, publicaciones y registros de archivos.
**Los archivos del bucket no se borran solos**: la API debe borrarlos antes (paso 6 y 16).

### Cómo ejecutar
1. Neon → tu proyecto → **SQL Editor**.
2. Pega y ejecuta `database/schema.sql`.
3. Edita correo/contraseña en `database/seed_admin.sql` y ejecútalo.
4. Inicia sesión con ese admin y cambia la contraseña.
