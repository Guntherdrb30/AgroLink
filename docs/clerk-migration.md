# Integración de Clerk — AgroLynk

## Alcance y decisiones (17-10-2026)

- App Clerk EXISTENTE: `app_3Kp7s4U58XgR0fF3nBcy8TBh2ik`; proyecto tipo Consumer.
- La identidad (registro, recuperación, Google, sesión) vive en Clerk.
- El identificador interno de `User.id` (CUID), `Tenant`, `TenantMembership`, fincas, animales y roles no se reemplazan por IDs de Clerk.
- Se crea `User.clerkUserId` opcional y único.
- Nunca se vincula un usuario local por coincidencia de email: requiere migración administrativa validada.
- Los nuevos usuarios crean una empresa en `/onboarding` después de verificar el email.
- `ROOT` y `PLATFORM_ADMIN` nunca se conceden automáticamente.
- Se preserva la revisión documental de la empresa y se bloquean operaciones mientras no esté verificada.

## Credenciales y alcance del entorno

1. Iniciar sesión en la terminal del propietario: `npx -y clerk@latest auth login`.
2. Asociar SOLO la aplicación existente; en el proyecto sin Clerk, usar `npx -y clerk@latest init --app app_3Kp7s4U58XgR0fF3nBcy8TBh2ik --no-skills`, si se desea usar la CLI. No ejecutar init en repositorios donde Clerk ya esté instalado, como ESTA rama.
3. Si faltan claves, `npx -y clerk@latest link --app app_3Kp7s4U58XgR0fF3nBcy8TBh2ik` y `npx -y clerk@latest env pull` en una terminal privada. No volver a enlazar si ya lo está.
4. Configurar las claves de DEVELOPMENT de Clerk en Vercel **solo para la rama Preview**: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`. Nunca usar claves de producción en Preview.
5. **ADVERTENCIA:** actualmente Vercel muestra `DATABASE_URL` en los targets production, preview y development. No ejecutar `db:push`, `migrate`, `seed` ni pruebas de escrituras en Preview hasta cambiar la variable de esta rama a una **rama Neon/Postgres aislada**.
6. En esa BD de desarrollo aislada ejecutar `npx prisma db push` para agregar `User.clerkUserId`, sin cambiar los ID de negocio.
7. El servidor no inicia sesión en la CLI de Clerk desde el navegador ni hace accountless setup porque la app ya existe.

## Verificación técnica

- `npm install` actualiza el lockfile; **confirmar y guardar package-lock.json** antes de fusionar. Vercel realiza instalación con npm en Preview, pero un `npm ci` estricto necesita lockfile sincronizado.
- `npx -y clerk@latest doctor` desde un terminal autenticado.
- `npm run lint`, `npm run build`, `npx prisma generate`.

## Pruebas end-to-end (pendientes, requieren claves y BD Preview aislada)

1. Público sin sesión ve inicio y /login, pero /dashboard, /farms, /livestock, /operations y /api/blob/upload están protegidos.
2. Crear usuario de prueba en la aplicación Clerk seleccionada, verificar correo e iniciar sesión.
3. Crear empresa en /onboarding. Verificar `User.clerkUserId`, asociación de `TenantMembership`, rol TENANT_OWNER y VerificationProfile PENDING.
4. Impedir doble onboarding y verificar la imposibilidad de asignarse rol ROOT.
5. Aprobar expediente en un usuario ROOT configurado explícitamente y verificar acceso a fincas.
6. Probar que usuarios de dos empresas no puedan consultar ni modificar recursos ajenos; comprobar con sesiones distintas.
7. Probar acceso Google, recuperación de contraseña, cierre de sesión con UserButton y reinicio de sesión.
8. Verificar que las URLs de documentos clasificados privados no sean accesibles públicamente; **bloqueador separado detectado previamente**, el proveedor de Blob requiere endurecimiento.

## Rollout

- El código solo vive en `feat/clerk-auth-migration` y una PR en borrador.
- No fusionar sin claves correctas, aislamiento de la BD, lockfile sincronizado, prueba funcional de multiempresa, auditoría de datos privados y aprobación.
- No se han creado ni importado usuarios reales, ni contratado suscripciones de pago.

## Reversión

La rama `main` permanece con Auth.js hasta autorizar el merge. No ejecutar migraciones de datos reales durante esta fase. Para revertir Preview, desplegar nuevamente main sin afectar el esquema de producción.

## Cortafuegos de base de datos Preview

Por seguridad, la rama incluye una barrera activa cuando `VERCEL_ENV=preview`:
las rutas privadas y el aprovisionamiento interno están bloqueados con HTTP 503 a menos que
`AGROLYNK_PREVIEW_DB_ISOLATED=true`.

**No fijar esta variable hasta haber verificado por separado que el `DATABASE_URL` branch-scoped no es el mismo que usa producción** y que se han sincronizado las referencias de conexión necesarias.
Esta barrera no sustituye el aislamiento de credenciales; es una segunda línea de defensa.

El proyecto Neon original `morning-star-70577084` pertenece a un plan Launch administrado por Vercel. Crear ramas con compute puede consumir recursos facturables; no hacerlo antes de la aprobación de costos.
