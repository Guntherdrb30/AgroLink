# GanadIA - Sprint 0: seguridad documental y base de suscripciones

Estado: inicio de desarrollo, sin aprobacion para desplegar ni activar cobros.

## Alcance de este sprint

- Mantener la prohibicion de subir archivos privados a almacenamientos publicos.
- Definir validaciones automaticas para que ningun flujo degrade documentos privados a publicos.
- Publicar catalogo de planes preliminar por animales activos (0-99, 100-299, 300-1500, 1501-3000, 3001+).
- Preparar el esquema de billetera IA **por finca** y nunca por usuario, para un sprint posterior.
- Ejecutar pruebas unitarias y CI; no tocar datos de Neon ni pagos reales.

## Estado tecnico que bloquea documentos privados

El codigo de `lib/blob/storage.ts` sigue lanzando `PRIVATE_STORAGE_NOT_CONFIGURED`.
Esto es correcto mientras no exista un almacen privado operativo.

Se constato en Vercel que `agro-link` no tiene variables de Blob configuradas
(consulta de nombres, sin leer secretos). **No cargar cedulas, RIF o archivos Excel reales.**

Para habilitar, se requiere:
1. Confirmacion explicita para aprovisionar un Blob privado (puede generar costos).
2. Crear/conectar un almacen privado independiente de imagenes publicas.
3. Actualizar `@vercel/blob` a >= 2.3 y lockfile de forma reproducible.
4. Implementar rutas autenticadas por tenant y rol para lectura/descarga, con `get(path, { access: "private" })`.
5. Migrar listas de documentos para que enlacen a rutas autenticadas por ID y nunca URLs del proveedor.
6. Incorporar pruebas de aislamiento de tenant, controles de acceso, descargas, eliminacion y retencion; revisar subida maxima.
7. Activar con prueba de archivos **ficticios**, sin documentos reales.

Guia de Vercel: https://vercel.com/docs/vercel-blob/private-storage

## Catalogo de planes propuesto

| Plan | Animales activos por finca | USD/mes | Creditos IA/mes |
| --- | ---: | ---: | ---: |
| Esencial | 0-99 | 29 | 300 |
| Productiva | 100-299 | 79 | 1000 |
| Integral | 300-1500 | 149 | 2000 |
| Profesional | 1501-3000 | 249 | 4000 |
| Corporativo | 3001+ | A convenir | Personalizado |

Importes de referencia para facturar en Bs a tasa BCV aplicable, sujetos a tratamiento
fiscal y aprobacion comercial. La productividad y la cantidad real de animales
afectan recomendaciones y reportes, pero no determinan por si solas una comision
automatica ni cambian datos historicos.

Se requiere registrar un estado de ciclo de vida (activo, vendido, muerto, egresado)
que **aun no existe** en el modelo Animal. No calcular niveles de plan a partir
de count(*) indiscriminado.

### Billetera por finca (propuesta, no implementada)

- `FarmSubscription`: finca, plan, periodo, estado, USD acordados, tasa BCV
  aplicada e identidad de la entidad facturadora.
- `FarmAiWallet`: finca unica, saldo comprado, saldo mensual y reservas.
- `FarmAiLedgerEntry`: movimiento inmutable con identificador de solicitud,
  usuario ejecutor, costo estimado/final y traza de idempotencia.
- `AiUsageReservation`: reservar al iniciar, liquidar cuando termine,
  reembolsar si falla; tarifas configurables por modelo y funcion.
- La recarga y la cuota de suscripcion son conceptos separados.
- Si se agota la IA, el ERP sigue funcionando sin restricciones.
- Cambios de plan por crecimiento del hato no pueden bloquear nacimientos ni
  registros sanitarios de animales.
- Cobro real desactivado hasta prueba y autorizacion posterior.

Referencia de patrones verificados en `Guntherdrb30/LUNA-VIDEO-IA`:
`src/server/wallet/service.ts`,
`src/server/billing/generation-pricing.ts`,
`src/server/payments/service.ts`.
Reutilizar patrones de transaccion, ledger e idempotencia; no copiar credenciales,
beneficiarios ni wallets personales ni logica de videos.

## Segunda etapa, no incluida en este MVP

Tiendas de insumos, contrato digital proveedor, catalogos comerciales ajenos,
checkout multitienda, pagos divididos y comisiones a Trends 172, C.A.
