# AgroLynk

Base técnica inicial para AgroLynk, un SaaS multitenant para operación agropecuaria, marketplace verificado y gestión de fincas.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS v4
- shadcn/ui base
- Prisma + PostgreSQL
- Auth.js
- Vercel Blob
- PWA preparada

## Comandos

```bash
npm install
npm run dev
```

## Base de datos

```bash
npm run db:generate
npm run db:push
```

## Variables de entorno

Copiar `.env.example` a `.env.local` y completar:

- `DATABASE_URL`
- `AUTH_SECRET`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `BLOB_READ_WRITE_TOKEN`
- `NEXT_PUBLIC_APP_URL`
