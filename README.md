# Plantilla Portafolio Académico

Plantilla de portafolios web para estudiantes: cada portafolio tiene su URL pública (`/p/:slug`),
su dueño lo edita tras iniciar sesión y un administrador gestiona usuarios y moderación.

- Frontend: React + Vite
- Backend: Vercel Functions (`/api`)
- Base de datos: Neon Postgres (`database/schema.sql`)
- Archivos: bucket S3-compatible

Plan de trabajo paso a paso: [docs/PLAN.md](docs/PLAN.md)

## Desarrollo local
```bash
npm install
cp .env.example .env   # completar variables
npm run dev            # frontend + API en http://localhost:5173
```

`npm run dev` sirve también las funciones de `/api` gracias al plugin `dev/vite-api-plugin.js`
(solo desarrollo). Para reproducir exactamente el entorno de Vercel: `npm run dev:full`
(requiere `npx vercel login` y `npx vercel link` la primera vez).
