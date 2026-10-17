# Notificaciones de AgroLynk

La identidad y los mensajes de OTP, verificación de correo y recuperación pertenecen a Clerk.
AgroLynk utiliza Resend **solo** para notificaciones del producto.

## Activación

El dominio de Resend `trends172tech.com` está verificado en la cuenta conectada, pero a 17 de octubre de 2026 no existía `RESEND_API_KEY` en el proyecto Vercel `agro-link`.

1. Crear desde el dashboard de Resend una clave **Sending access**, limitada al dominio `trends172tech.com`.
2. Añadir `RESEND_API_KEY` como variable cifrada en Vercel (Production); **no compartirla en chats ni guardarla en GitHub**.
3. Añadir `AGROLYNK_EMAIL_FROM` con una dirección del dominio verificado, por ejemplo `AgroLynk <notificaciones@trends172tech.com>`.
4. Volver a desplegar `main` y comprobar en Resend el estado *Delivered* después de enviar un correo de prueba desde el panel de verificación.

Eventos: bienvenida tras crear empresa, expediente presentado, revisión iniciada, aprobado, correcciones y rechazado. No se envían documentos ni información personal sensible por correo. La petición API solo indica *aceptado*, no que llegó al buzón. El error de correo no revierte transacciones de negocio.

Para el primer usuario que se registró **antes** de activar estos avisos, la pantalla de verificación ofrece «Enviar correo de bienvenida», con límite de una solicitud aceptada cada 15 minutos por usuario/empresa.

Consulta **Clerk Dashboard > Logs > Email Logs** para comprobar si Clerk realmente intentó enviar un OTP o correo de autenticación. Con Google OAuth y correo verificado no necesariamente existe mensaje de verificación pendiente.

### Protección de documentos

Las subidas clasificadas `PRIVATE` permanecen bloqueadas porque el almacenamiento público anterior no cumple requisitos de privacidad. No pedir a usuarios que adjunten documentos por correo; habilitar una tienda privada y descargas autorizadas antes de probar verificación documental.
