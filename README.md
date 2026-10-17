# AgroLynk

Plataforma SaaS multiempresa para gestión agropecuaria, trazabilidad ganadera y marketplace verificado.

## Tecnología

- Next.js 16, TypeScript, Tailwind CSS 4 y shadcn/ui
- Prisma 6 + PostgreSQL
- Clerk (identidad, correo, Google y sesiones)
- Control multiempresa (Tenants), membresías y roles en PostgreSQL
- Vercel Blob y PWA preparada

## Autenticación en desarrollo

Esta rama migra de Auth.js a **Clerk**, conservando IDs internos de usuarios y recursos. 
La aplicación Clerk **ya creada** tiene el ID: `app_3Kp7s4U58XgR0fF3nBcy8TBh2ik`.
No ejecutes un `clerk init` sin `--app`: crearía otra aplicación si la CLI no está autenticada.

Las claves de Clerk **nunca** se guardan en Git ni se pegan en una conversación.
Consulta [el procedimiento de integración](docs/clerk-migration.md) antes de probar.

## Comandos

```bash
npm install
npm run dev
npm run lint
npm run build
npm run db:generate
```

Aplicar el nuevo campo `User.clerkUserId` **solo en una base de datos de desarrollo aislada** mediante `npm run db:push`. No ejecutar contra producción.

## Variables necesarias

- `DATABASE_URL` (base de datos aislada en Preview)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (Clerk Development)
- `CLERK_SECRET_KEY` (Clerk Development, solo servidor)
- `BLOB_READ_WRITE_TOKEN` (cuando se requieran archivos)
- `NEXT_PUBLIC_APP_URL` (URL del entorno actual)

Las variables antiguas `AUTH_SECRET` / `AUTH_GOOGLE_*` dejan de utilizarse después de la migración.

## Estado

El código de autenticación está preparado; el lanzamiento requiere las claves del entorno Preview, una BD aislada, pruebas de alta/inicio de sesión y validación de roles, y aprobación explícita antes de producción.
