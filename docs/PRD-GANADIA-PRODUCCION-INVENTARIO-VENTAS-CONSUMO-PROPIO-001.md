# GanadIA — PRD-PIVC-001
## Produccion, Inventario, Ventas y Consumo Propio
**Version:** 0.1 (borrador funcional)
**Fecha:** 2026-10-24
**Producto:** GanadIA (repositorio AgroLink)
**Responsable funcional:** Trends172Tech
**Estado:** especificacion para revision y desarrollo; NO constituye implementacion desplegada.

## 1. Objetivo y decision de producto
Construir sobre el ERP actual un unico motor por empresa y finca que permita registrar materia prima generada, inventario, formulas de produccion, ordenes de transformacion, productos terminados, ventas, consumo propio y perdidas; conciliar movimientos y calcular resultados operativos defendibles, sin fabricar ingresos ni duplicar costos.

Debe servir a fincas que solo ceban y venden ganado y a fincas mixtas que ordeñan, hacen queso, engordan cochinos y comercializan distintos productos. Todos los modulos son activables por finca. El productor crea sus productos, unidades y categorias, en lugar de que GanadIA codifique exclusivamente queso, leche o cochinos.

La funcion **Consumo propio** forma parte del alcance principal, no es una caracteristica opcional ni una venta ficticia.

## 2. Estado del codigo inspeccionado (2026-10-24)
- Se dispone de Tenant, Farm, permisos por finca y autenticacion Clerk.
- Crea tu Finca guarda una descripcion declarada y su perfil; NO crea automaticamente animales ficticios.
- El modelo Animal contempla especie, finca, identificacion e inventario ACTIVE/SOLD; las ventas individuales se gestionan mediante LivestockSale, borrador y confirmacion.
- FarmErpItem contiene insumos y activos, FarmErpStockMove admite RECEIPT/USE/ADJUST_PLUS/ADJUST_MINUS y FarmErpFinance admite INCOME, EXPENSE, PAYABLE, RECEIVABLE, PAYMENT_IN y PAYMENT_OUT.
- No se encontraron modulos especializados completos para produccion lactea, recetas, queso, inventario de producto terminado ni consumo propio de animales. No se debe llamar 'venta' al movimiento USE existente.
- Los documentos anteriores de ERP y Crea tu Finca distinguen planes de funcionalidades verificadas. Este PRD conserva esas diferencias.

Evidencia: prisma/schema.prisma; components/farms/crea-tu-finca.tsx; components/farms/farm-erp-client.tsx; components/sales/sales-client.tsx; server/services/livestock-sale-service.ts.

## 3. Actividades y catalogos por finca
Cada finca puede habilitar:
- Bovinos: cria, ceba, leche, doble proposito.
- Porcinos: engorde por lotes, reproduccion, inventario y sanidad.
- Produccion de materias primas, como leche cruda.
- Elaboracion/transformacion, como queso.
- Venta general de productos producidos o comprados para reventa.
- Consumo propio y retiros, siempre disponibles cuando exista inventario.

Entidades candidatas: ProductCategory, Product, ProductUnit, RawMaterialSource, InventoryLot, InventoryMovement, Recipe, RecipeIngredient, ProductionOrder, ProductionInput, ProductionOutput, FarmSale, FarmSaleItem, InternalConsumption, InternalConsumptionItem, AccountingAllocation.

Todos los registros deben contener tenantId, farmId, actor, fechas, estado y referencias auditables. La opcion de usar modelos existentes requiere evaluacion de compatibilidad y migracion aditiva.

El catalogo de productos distingue materia prima, insumo, producto terminado y articulo de reventa. La misma ficha de producto puede tener distintas recetas versionadas por finca. No equiparar cantidades en litros con kilos sin una conversion sustentada y expresamente configurada.

## 4. Materia prima y transformacion
A. Registro de entrada: la finca ordeña 120 L, compra leche o recibe una transferencia formal; cada entrada identifica origen, lote, cantidad, costo si se conoce y responsable.
B. Formula: el productor indica cuanta leche y otros insumos utiliza por 1 kg de queso. No imponer litros/kg universal. Versionar y fechar la formula.
C. Orden: reservar existencias; anotar cantidades realmente utilizadas, producto terminado, mermas, unidades, fecha y lote. Permitir borrador sin afectar inventario; confirmacion transaccional descuenta insumos y aumenta existencias terminadas.
D. Venta: confirmar un pedido descuenta solo el lote disponible y crea movimiento comercial y financiero correspondiente. La transformacion no genera ingreso por si misma.
E. Uso interno: ver seccion 5, no se transforma ni vende por declaracion implicita.

Ejemplo ilustrativo, NO datos reales: 120 L de leche inicial; 40 L vendidos, 70 L transformados, 5 L consumidos por empleados y 5 L de existencia. Si la transformacion produce 7 kg reales de queso y se consumen internamente 2 kg, quedan 5 kg disponibles, antes de otras ventas. No calcular 7 kg como hecho si falta medicion real.

Balance por lote y periodo:
existencia final = existencia inicial + entradas + produccion terminada recibida + transferencias de entrada - ventas - consumo propio - consumo para transformacion - mermas - transferencias de salida +/- ajustes auditables.
No contar doble los movimientos de conversion, ni permitir saldo negativo. Cada lote tiene version, unidad, fecha, responsable e historial de movimientos.

## 5. Consumo propio — alcance obligatorio
### 5.1 Definicion
Una salida real de inventario que la finca destina a uso interno y que NO supone una venta al cliente, un ingreso cobrado ni una perdida por deterioro. Incluye:
- Una res sacrificada para reunion de la empresa o comida de empleados.
- Un cochino destinado al consumo del personal.
- Litros de leche consumidos dentro de la finca.
- Kilos de queso u otros productos terminados entregados para consumo interno.
- Otros productos o materias primas de propiedad de la finca consumidos para fines internos.

Distinguir explicitamente:
- CONSUMO_PROPIO_OPERATIVO: alimentacion de empleados, jornadas o eventos empresariales.
- RETIRO_PROPIETARIO: retiro personal del titular; requiere tratamiento contable distinto, sin imputarlo automaticamente como gasto operativo.
- USO_PRODUCTIVO: leche destinada a queso, alimento animal consumido en produccion u otros insumos; va a orden de produccion/centro de costo, NO al consumo propio de alimentacion.
- PERDIDA_MERMA: perdida, caducidad, muerte o robo; nunca disfrazarla como consumo propio.
- VENTA: salida con contraprestacion, cliente e ingreso/cuenta por cobrar.
- TRASLADO: cambio de ubicacion entre fincas; no genera consumo ni venta por si solo.

### 5.2 Formulario y workflow
Ubicacion: menu **Produccion, Inventario y Ventas > Consumo propio** y tarjeta-resumen en panel de finca.
Campos: finca, fecha/hora, motivo (empleados, reunion empresarial, alimentacion interna, retiro del propietario u otro), producto/lote o animal individual, cantidad, unidad, area/centro de costo, destinatario o actividad, observaciones, costo registrado/estimado, responsable, documento interno y aprobador, cuando aplique. Datos personales deben minimizarse.
Estados: DRAFT > CONFIRMED; REVERSAL como movimiento compensatorio, sin borrado de hechos historicos. Borrador no descuenta; confirmacion valida permisos, saldo y estado; ajusta el inventario con transaccion atomica, audita motivo/actor/valor/costo. idempotencyKey evita duplicados.
La interfaz debe mostrar costo 'sin determinar' cuando falte el costo real; nunca atribuirle el precio de venta como costo automaticamente.

### 5.3 Animales biologicos
Seleccionar finca y animal identificable (bovino) o lote/animal identificado (porcino). Guardar evento 'sacrificio para consumo interno' con cantidad, fecha, peso conocido, motivo y autorizacion. Marcar estado de inventario no disponible para futuras ventas (ampliacion segura del enum o modelo equivalente); conservar genealogia, historia sanitaria y trazabilidad. NO marcar SOLD ni generar LivestockSale.
Para sacrificio parcial de un lote porcino, descontar solo unidades verificadas. Si el animal se transforma en carne/cortes que tambien se venderan, crear orden de transformacion con lotes de carne y registrar separadamente la porcion consumida y la porcion vendida, sin retirar el mismo animal dos veces.
Los requisitos sanitarios, de movilizacion, sacrificio y tributarios aplicables deben ser verificados por profesionales competentes; un documento interno de GanadIA no reemplaza autorizaciones oficiales.

### 5.4 Productos y materias primas
Leche: consumir litros desde un lote identificable de leche disponible; debe cuadrar con ordeño, ventas, elaboracion de queso y mermas.
Queso: consumir kg, unidades o presentaciones desde un lote de producto terminado; no descontar nuevamente leche ya utilizada en su elaboracion.
Otros productos: descontar solo inventario disponible y registrar valor al costo de forma consistente.
No permitir un consumo sobre un lote agotado, vencido o bloqueado por sanidad sin advertencia y/o restriccion de uso segun reglas aprobadas.

## 6. Costeo, resultado financiero y contabilidad
- Guardar costo a partir del costo historico de inventario, formula de produccion y valorizacion aprobada, separando costo real, estimado y faltante.
- Consumo propio operativo puede reclasificarse a un centro de gasto empresarial desde existencias valorizadas, cuando aplique; el asiento debe evitar doble contabilizacion de costos ya reconocidos.
- Retiros personales del propietario se reportan separados como distribucion/retiro patrimonial sujeto a politica contable y asesoria; no reducen automaticamente la utilidad operativa empresarial.
- Consumo de materia prima en elaboracion y alimento en crianza se registra como costo de produccion, no como una segunda salida de consumo propio.
- Las ventas muestran ingresos, costo de ventas, margen bruto y cuentas por cobrar/cobros por separado; inventario y transformaciones no generan ingresos.
- Si no existe costo verificable, el panel debe indicar 'utilidad provisional / pendiente de costeo' y nunca inventar margen neto.
- La generacion de documentos internos no representa facturacion fiscal. IVA y demas implicaciones de autoconsumo se verifican con contador y normativa venezolana vigente; no asumir tratamiento fiscal automatico.

Indicadores: ingresos por ventas, costo de ventas, consumo propio operativo al costo, retiro propietario separado, costos de transformacion, mermas, otros gastos, utilidad/margen operativo estimado, flujo de caja, existencias finales y cuentas por cobrar/pagar. No mezclar efectivo con utilidad.

## 7. Reportes y panel principal
Filtros por empresa, finca, fecha, actividad, centro de costo, producto, especie, lote y responsable.
Tarjetas: Inventario; Produccion; Ventas; Consumo propio (cantidad y costo); Retiros del propietario; Mermas; Margen bruto; Resultado operativo; Cobros pendientes.
Graficas: consumo propio mensual y por motivo; leche producida vs vendida/transformada/consumida; animales vendidos vs consumidos/sacrificados; queso producido vs vendido/consumido; valor por finca y centro de costo.
Informes PDF/CSV autorizados con detalle, costo, unidad, periodo, documentos internos y fuente del dato. Datos faltantes se muestran como 'Sin registrar', no como cero falsamente.

## 8. Experiencia de usuario y asistente IA
- En Crear producto, preguntar si se produce, transforma, compra para revender o es materia prima, y permitir definir formula, ingredientes y rendimiento.
- En Crea tu Finca, usar 'Crear propuesta con inteligencia artificial', no 'con OpenAI'. La propuesta sugiere actividades y modulos; no crea animales ficticios.
- Crear un acceso 'Registrar consumo propio' desde actividad y desde la ficha del producto/animal; proponer solo productos disponibles.
- El agente puede explicar balances, sugerir formulas y detectar diferencias (p. ej., leche usada supera leche disponible), siempre con referencias a movimientos reales.
- El agente NO confirma ventas, sacrificios, retiros, costos ni ajustes por lenguaje ambiguo: solicita confirmacion humana y respeta presupuesto piloto de IA.

## 9. Seguridad e integridad
- Autenticacion Clerk vigente y alcance tenantId + farmId + rol evaluados en servidor para lecturas y escrituras.
- Autorizacion reforzada para sacrificio animal, consumo propio y retiros del propietario. Roles con solo lectura no pueden confirmar movimientos.
- Idempotencia por solicitud y comprobantes con folio por empresa/finca; transacciones de base de datos para cada confirmacion; control de concurrencia.
- Migraciones aditivas, respaldo y verificacion de compatibilidad de relaciones; preservar animales, ERP, ventas y produccion historicos.
- Auditoria de correcciones/reversos con actor, fecha, motivo, antes/despues. No eliminar movimientos confirmados.
- Mantener monedas originales y costos historicos; reportar USD y VES por separado salvo conversion con tasa y fuente verificadas.

## 10. Etapas de implementacion
G1. Ajustes UX 'inteligencia artificial' y claridad entre rebaño declarado y animales dados de alta.
G2. Modelo multi-finca de productos, unidades, materias primas, lotes y movimientos.
G3. Formulas versionadas y ordenes de produccion (leche a queso como primera prueba).
G4. Ventas generales y recepcion ERP, conectadas a clientes y finanzas existentes sin doble ingreso.
G5. **Consumo propio obligatorio** para leche, queso/productos y animales (incluye retiro del propietario), con auditoria y costo.
G6. Tablero de ventas, balances, utilidad real/provisional y reportes de consumo propio.
G7. Integracion del asistente AI read-only con borradores autorizables, pruebas funcionales y verificacion de despliegue.

La entrega funcional del sistema NO se considera completa hasta que G5 (consumo propio) y G6 (KPIs, costos y reportes) superen pruebas. La secuencia real puede combinar G4-G6 en un mismo sprint para mantener consistencia.

## 11. Pruebas de aceptacion
1. Una finca crea queso y define 10 L/kg como rendimiento propio; cambia la formula y conserva versiones historicas.
2. Se registran 120 L de ordeño; 40 L venta, 70 L a queso, 5 L consumo propio, 5 L final. Intentar consumir 6 L adicionales sin entrada debe bloquearse.
3. De 70 L se obtienen realmente 7 kg de queso. Consumo propio 2 kg -> quedan 5 kg; no se descuenta por segunda vez leche.
4. Bovino ACTIVE elegido para consumo propio no puede venderse ni consumirse una segunda vez; su historia permanece visible.
5. Lote porcino con 10 animales, 1 sacrificado para personal -> 9 disponibles, sin crear venta.
6. Consumo de una res para reunion de empresa se refleja como gasto interno a costo si hay politica y valor; nunca como ingreso por venta.
7. Retiro personal del propietario figura separado, sin alterar incorrectamente utilidad operativa.
8. Registros de empleados, eventos y centros de costo no deben aparecer en fincas ajenas.
9. Doble clic, reintento y dos confirmaciones simultaneas no duplican salidas ni finanzas.
10. Un reverso deja historial y restablece saldo/contabilidad conforme al estado biologico: no resucitar un animal sacrificado; usar correccion auditada.
11. El panel reporta costos sin determinar cuando no existen; no muestra falsa utilidad exacta.
12. Informes desglosan consumo por especie, producto, motivo, finca, costo y periodo.
13. Ventas existentes y comprobantes internos anteriores continúan funcionando; pruebas de no regresion.
14. No se ejecutan nuevas llamadas facturables a OpenAI hasta confirmar cuota y presupuesto vigente.
15. Solo declarar 'en produccion' despues de migracion validada, pruebas, despliegue READY y prueba autenticada end-to-end.

## 12. Evidencia y seguimiento
- Codigo: https://github.com/Guntherdrb30/AgroLink
- Documento previo Crear tu Finca: docs/PRD-GANADIA-CREA-TU-FINCA-001.md
- Documento ERP: docs/ganadia-erp-agropecuario-architecture-v1.md
- Documento GIS y produccion porcina: docs/ganadia-gis-simulaciones-architecture-v1.md
- Venta bovina: server/services/livestock-sale-service.ts
- ERP: app/api/farms/[farmId]/erp/route.ts

**Registro de decision 2026-10-24:** El usuario solicita un catalogo configurable de productos y materias primas, recetas de transformacion y una seccion completa de consumo propio que incluya leche, queso, reses, cochinos y otras existencias, con impacto en utilidad e informes. Este documento preserva ese alcance hasta su implementacion y validacion.
