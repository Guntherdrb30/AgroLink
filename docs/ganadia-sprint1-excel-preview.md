# GanadIA - Sprint 1: vista previa de Excel ganadero

Objetivo: cargar un inventario de prueba desde CSV/XLSX, identificar columnas y errores, y presentar una **vista previa sin escrituras en la base de datos**.

## Alcance autorizado
- Endpoint POST /api/imports/livestock/preview, autenticado por Clerk y con finca del tenant.
- Roles: propietario, administrador o encargado.
- Hasta 2 MB de archivo y 500 filas por lote de vista previa.
- Se admiten extensiones .csv y .xlsx, no archivos con macros.
- Vista previa de codigos, especie, raza, sexo, peso, linea productiva, nacimiento y lote.
- Alerta de duplicados **dentro del propio archivo**. No se valida contra animales existentes en BD en esta fase.
- Este endpoint no usa IA, no persiste archivos ni hace cargos.
- Pruebas unitarias con hojas generadas en memoria, sin datos de clientes.

## Pendientes antes de importar a BD
1. Revisar seguridad del parser XLSX y preparar aislamiento/actualizacion del paquete; el xlsx actual es version 0.18.5.
2. Cargar vista previa completa en UI; añadir mapeo manual y confirmacion explicita.
3. Verificar duplicados entre archivos y base de datos por finca/tenant sin revelar otros clientes.
4. Catalogos de especie/raza por tenant y reglas de normalizacion.
5. Importacion por lotes, auditoria por usuario, idempotencia y rollback.
6. Control de filas y limites de archivo en proxy, incluyendo solicitudes sin Content-Length.
7. Tests de archivos maliciosos/corruptos y cargas simultaneas.

No ejecutar migraciones ni modificar produccion.
