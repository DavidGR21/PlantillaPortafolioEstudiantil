# Plantilla Portafolio Académico

Plantilla de portafolios web para estudiantes: cada portafolio tiene su URL pública (`/p/:slug`),
su dueño lo edita tras iniciar sesión y un administrador gestiona usuarios y moderación.

- **Frontend:** React + Vite
- **Backend:** Vercel Functions (`/api`) — todo se publica con un solo despliegue
- **Base de datos:** Neon Postgres (`database/schema.sql`)
- **Archivos:** bucket S3-compatible de Neon (privado; se sirven con URLs firmadas)

Plan y arquitectura: [docs/PLAN.md](docs/PLAN.md)

## Funcionalidades

- Estudiantes: hasta 3 portafolios (configurable por usuario), apartados del menú, parciales,
  publicaciones con varios PDF/imágenes, visor integrado, color y datos del portafolio.
- Administrador: crear usuarios, activar/desactivar, restablecer contraseñas, bloquear,
  desbloquear o eliminar portafolios, y bitácora de todas sus acciones.
- Seguridad: sesión en cookie `httpOnly`, límite de intentos de login, cambio de contraseña
  que cierra otras sesiones, CSP y cabeceras de seguridad, verificación de propiedad en cada cambio.

## Desarrollo local

```bash
npm install
cp .env.example .env   # completar las variables (ver abajo)
npm run dev            # frontend + API en http://localhost:5173
```

`npm run dev` sirve también las funciones de `/api` gracias al plugin `dev/vite-api-plugin.js`
(solo desarrollo). Las cabeceras de seguridad de `vercel.json` solo se aplican en Vercel.

## Base de datos (Neon)

1. Neon → tu proyecto → **SQL Editor** → ejecuta `database/schema.sql`.
2. Edita correo, nombre y contraseña en `database/seed_admin.sql` y ejecútalo (primer administrador).
   No subas a git ese archivo con tus datos reales.
3. Bases creadas antes del paso 19: ejecuta también `database/migrations/001_seguridad.sql`.

## Variables de entorno

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Cadena de conexión de Neon (la *pooled*) |
| `JWT_SECRET` | Cadena aleatoria de 32+ caracteres para firmar las sesiones |
| `JWT_EXPIRES_IN` | Duración de la sesión, p. ej. `7d` |
| `AWS_ENDPOINT_URL_S3` | Endpoint S3 del bucket de Neon |
| `AWS_REGION` | Región del bucket |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | Credenciales del bucket |
| `AWS_S3_BUCKET` | Nombre del bucket |

## Despliegue en Vercel

1. Sube el repositorio a GitHub: `git push origin main`.
2. En [vercel.com/new](https://vercel.com/new) importa el repositorio. Vercel detecta Vite;
   no cambies los comandos de build.
3. En **Settings → Environment Variables** agrega todas las variables de la tabla
   (para *Production* y *Preview*). Usa un `JWT_SECRET` propio para producción.
4. Despliega. Cada `git push` a `main` vuelve a desplegar automáticamente.
5. Restringe el CORS del bucket a tu dominio (por defecto acepta cualquier origen):
   ```bash
   npm run bucket:cors -- https://tu-app.vercel.app            # muestra el cambio
   npm run bucket:cors -- https://tu-app.vercel.app --aplicar  # lo aplica
   ```
6. Verifica el despliegue (no modifica nada):
   ```bash
   npm run verify -- https://tu-app.vercel.app
   ```

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Desarrollo (frontend + API) |
| `npm run build` | Build de producción |
| `npm run lint` | Revisión de código (oxlint) |
| `npm run bucket:cors -- <dominio> [--aplicar]` | Configura el CORS del bucket |
| `npm run verify -- <url>` | Verifica un despliegue en producción |
