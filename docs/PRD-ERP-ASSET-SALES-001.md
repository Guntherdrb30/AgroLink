# PRD-ERP-ASSET-SALES-001 - Venta de activos y equipos en GanadIA
Version 1.0 | 24 octubre 2026 | Trends172Tech | Diseno aprobado para siguiente modulo

## 1. Alcance y diagnostico del ERP actual
GanadIA ya gestiona FarmErpItem con kind SUPPLY o ASSET, cantidad, costo y serial. Existen movimientos FarmErpStockMove, finanzas FarmErpFinance y terceros FarmErpPartner. Aun NO hay una transaccion comercial de venta de activos. La operacion USE (consumo) y el ajuste ADJUST_MINUS no deben registrarse como venta.

## 2. Casos de uso
- Vender un tractor identificado por serial, cantidad de una unidad.
- Vender herramientas o equipos del inventario con cantidades y precio.
- Registrar venta de contado o credito, comprador y condiciones.
- Guardar borrador antes de autorizacion final.
- Actualizar inventario, ingresos/cuentas por cobrar y trazabilidad en una misma transaccion.
- Emitir comprobante interno formal e historial, sin hacerse pasar por factura fiscal.

## 3. Roles y estados
TENANT_OWNER y TENANT_ADMIN con permisos sobre finca pueden preparar/autorizar. Separar permisos futuros de contabilidad, gerencia y operador. Estados DRAFT y CONFIRMED, con CANCELLED solo para borrador. Una venta confirmada solo admite reversos auditables, no borrados.

## 4. Datos requeridos
- Finca de origen, SKU, item/activo, descripcion, numero de serie y estado.
- Cantidad a vender, precio unitario, moneda USD o VES, importe.
- Comprador: nombre o razon social, cedula/RIF, telefono, direccion de facturacion y entrega.
- Forma de pago (CONTADO/CREDITO), fecha, fecha de entrega, usuario responsable.
- Folio interno unico, requestKey idempotente y soportes privados.

## 5. Confirmacion transaccional
1. Borrador: no descuenta existencias.
2. Confirmacion: comprobar rol y alcance tenant/farm en servidor.
3. Bloquear el comprobante y validar inventario disponible, serial y cantidad.
4. Decrementar FarmErpItem.quantity por operacion condicional.
5. Registrar FarmErpStockMove.kind=SALE asociado al documento.
6. Registrar exactamente una obligacion contable FarmErpFinance: INCOME para contado o RECEIVABLE para credito, sin duplicar cobros como ingreso adicional.
7. Crear auditoria (actor, fecha, item, precio, comprador y folio). Revertir transaccion completa ante fallos.
8. Entregar PDF interno con distincion explicita de la factura legal.

## 6. Criterios contables y fiscales
Un activo fijo no es mercancia habitual. El costo historico, depreciacion acumulada, valor en libros y resultado por venta deben tratarse de acuerdo con politica contable profesional. No presentar diferencia de precio como ganancia neta sin esos datos.
El documento GanadIA es interno. No reemplaza factura fiscal ni obligaciones ante SENIAT. Cobro de credito no duplica importe vendido. Distinguir existencias serializadas indivisibles de herramientas no serializadas.

## 7. Interfaz y AI
Agregar en ERP por finca una seccion Venta de activos: buscar tractor/equipo, seleccionar unidad, comprador, precio y pago, preparar/confirmar, comprobante, historial y soporte.
GanadIA AI consulta inventario read-only, propone precios y pasos, y puede preparar borradores con autorizacion explicita. No genera bajas por instrucciones ambiguas.

## 8. Aceptacion y pruebas
- Dos confirmaciones concurrentes del mismo tractor: solo una exitosa.
- Reintentos idempotentes sin duplicar movimiento ni registro financiero.
- Pruebas de permisos entre empresas y fincas.
- Venta de contado, credito y pagos parciales con moneda consistente.
- Serial e historial del activo siguen visibles tras venta.
- Borrador no descuenta; confirmacion descuenta y deja comprobante.
- No afecta modulo de ganado, guias internas ni memorias.

## 9. Ejecucion
A0 Inventario/contabilidad y requisitos.
A1 Modelo y migracion aditiva.
A2 Servicio de venta segura y comprobante.
A3 Interfaz responsive y validaciones.
A4 Herramientas OpenAI read-only y flujo conversacional aprobado.
A5 Prueba end-to-end y publicacion verificada.

## 10. Proyecto pospuesto
Produccion de leche y venta diaria de litros, ordeños, tanques, calidad, mermas, clientes, entregas y facturacion: modulo separado en futura fase, no ejecutar ahora.
