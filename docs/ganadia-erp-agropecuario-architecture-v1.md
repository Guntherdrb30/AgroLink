# GanadIA — Arquitectura ERP Agropecuario Integral (V1)

Estado: **propuesta de arquitectura aprobable por fases**. Fecha: 2026-10-20. Mercado inicial: Venezuela. La aplicación conserva su identidad GanadIA, implementada en el repositorio AgroLink.

## 1. Visión y alcance

GanadIA evoluciona desde control de fincas, ganado y jornadas a un **ERP agropecuario integral**. El propietario debe ver datos consolidados de su empresa y resultados operativos, administrativos y económicos **de cada finca**, sin mezclar fincas, propietarios legales o empresas.

**No afirmar que un módulo futuro ya está operativo.** Las funcionalidades actuales de fincas, ganado, jornadas, archivos y roles deben conservarse.

## 2. Auditoría del código existente

Archivo de referencia: \`prisma/schema.prisma\`.

- \`Tenant\` agrupa empresas, usuarios, permisos y fincas.
- \`Farm\` registra nombre, ubicación, geolocalización, superficie, fotografía, logo y estado. No registra por sí solo RIF, hierro ni centros de costos.
- \`Animal\` tiene \`fatherId\`, \`motherId\`, peso inicial/actual, fecha de nacimiento/edad estimada, identificación visual, chip, origen, sexo, raza, finca y eventos.
- Existen tablas para pesos, vacunas, tratamientos, jornadas, gastos de jornadas y trabajadores.
- \`Employee\` hoy está asociado a \`Tenant\`, no a la finca como asignación de personal.
- \`FileStorage\` incluye propiedad por empresa y visibilidad; \`VerificationDocument\` pertenece al flujo de verificación. No sustituye un expediente legal autónomo de finca.
- No hay modelos operativos de libro mayor financiero, cuentas por pagar/cobrar, tesorería, inventario de insumos, proveedores o ventas.

## 3. Arquitectura organizacional

Relaciones recomendadas:

- **Empresa/Tenant**: cuenta empresarial, suscripciones, roles, reportes globales.
- **Titular legal**: persona natural/jurídica con identificador fiscal, documentos y representación. No asumir que toda finca tiene RIF propio.
- **Finca/Farm**: unidad de operación, dirección/ubicación, características, activos y métricas.
- **Relación titular-finca**: propietario, arrendatario, operador u otra relación; fechas, porcentajes si aplica, documentos de respaldo.
- **Acceso por finca**: membresía y permisos específicos por usuario, siempre limitados por \`tenantId\` **y** \`farmId\` al hacer consultas/escrituras.
- **Centros de costo por finca**: ganadería de carne, leche, cría, ceba, cultivos, potreros, mantenimiento, administración y otros configurables.

El propietario puede consultar empresa consolidada, una finca específica o comparativos. La transferencia entre fincas no es automáticamente una venta ni un gasto.

## 4. Ficha de cada finca

Secciones independientes:

1. **Resumen ejecutivo:** ganado, actividades, finanzas, tareas y alertas con período configurable.
2. **Información:** ubicación, mapas, hectáreas, divisiones, potreros, galpones, fuentes de agua, capacidad.
3. **Legal y documentos:** RIF del sujeto legal correspondiente, título/contrato, poderes, registro sanitario/productor, constancias, autorizaciones, fechas de emisión/caducidad, observaciones y documentos PDF/imagen opcionales.
4. **Hierros y señales:** dibujo/fotografía de marca, titular, registro/número/documento, vigencia cuando aplique, asociaciones con animales, historial de cambios; diferenciar de chapeta, chip o tatuaje.
5. **Ganado:** inventario biológico, trazabilidad, grupos, genealogía, eventos, historia.
6. **Operaciones:** jornadas, órdenes, mantenimiento, potreros, sanidad, reproducción y producción.
7. **Inventario:** almacenes/ubicaciones, lotes, proveedores, movimientos, costos, caducidad y mínimos.
8. **Administración y finanzas:** ingreso, gasto, cobro, pago, compras, ventas, cuentas por cobrar/pagar, tesorería, conciliación, presupuesto.
9. **Empleados:** asignaciones, asistencias, labores, adelantos, costos y, en una fase posterior, nómina parametrizable.
10. **Reportes y alertas:** resultado operativo, flujo de caja, balance pendiente, inventario, bienestar animal, tareas y permisos.

La captura de documentos **no debe ser obligatoria para operar en pruebas**; el titular decide registrar su expediente documental según el uso, y solo requisitos legales efectivamente aplicables deben considerarse en un trámite específico.

## 5. Expediente legal y movilización — Venezuela

Modelo conceptual: \`LegalParty\`, \`FarmLegalRelation\`, \`FarmDocument\`, \`CattleBrand\`, \`AnimalBrandAssignment\`, \`LivestockMovement\`, \`MovementDocument\`.

- Un hierro representa identidad/titularidad de ganado y debe permitir imagen, titular legal, identificador de registro, soporte y trazabilidad histórica.
- Documentos se almacenan en Blob **privado** y se sirven desde rutas autenticadas con autorización específica de finca y tipo documental.
- Preparar un **expediente de movilización** con origen, destino, transportista, listado de animales, propietario, identificaciones, registros sanitarios y documentación soporte.
- Solo adjuntar o verificar documentos expedidos por autoridad competente. **GanadIA no expide una guía oficial del INSAI ni certifica propiedad por cuenta propia** sin convenio e integración autorizada.
- Validar por asesor legal/agropecuario en Venezuela el órgano competente, exigencias vigentes y formatos; no codificar requisitos fijos derivados de normativa antigua.

## 6. Ficha ampliada del animal

Aprovechar \`Animal.fatherId\`, \`motherId\`, \`initialWeightKg\`, \`currentWeightKg\`, \`birthDate\`, \`estimatedAgeMonths\`, peso histórico y eventos existentes. No duplicar la información.

Añadir progresivamente:
- Identificaciones: código interno único por empresa, chapeta, microchip, hierro/propietario y marcas históricas.
- Genealogía: padre/madre internos, código y descripción externa para progenitores no presentes, origen de la información, certeza y validaciones para impedir ciclos imposibles.
- Vida: nacimiento, compra, traslado, venta, muerte, baja, motivo y documento; estado biológico y titularidad actual.
- Peso: nacimiento, ingreso, destete, controles y ganancia media diaria calculada sobre fechas y pesos registrados.
- Sanidad: vacunas, medicamentos, lote, dosis, responsable veterinario cuando corresponda, períodos de retiro y seguimiento.
- Reproducción: celos, montas, inseminaciones, toros/semen, diagnósticos, abortos/partos, lactancias y calendario.
- Producción: leche, lactancias, condición corporal, movimientos de potrero y consumo cuando aplique.
- Economía: costo de adquisición, gastos atribuibles, ventas, valorización bajo política contable explícita y margen de producción.

Para reproductores externos: permitir progenitor externo con referencia/documento sin crear un animal falso dentro del inventario de la finca.

## 7. Finanzas de alto nivel

Modelo candidato:
- \`FarmCostCenter\`, \`Counterparty\` (cliente/proveedor), \`PurchaseOrder\`, \`PurchaseReceipt\`, \`SalesOrder\`, \`Invoice\`, \`Receivable\`, \`Payable\`, \`Payment\`, \`BankAccount\`, \`FinancialAccount\`, \`JournalEntry\`, \`JournalLine\`, \`FarmBudget\`.
- Movimientos con ID estable, fecha efectiva, importe, moneda original, tasa y origen de tasa, documento adjunto, estado, actor, finca y centro de costo.
- Libro mayor inmutable con reversos/asientos correctivos; transacciones balanceadas y control de duplicados.
- Toda factura/cuenta por pagar y su pago se relacionan; pagar una factura NO genera el gasto otra vez.
- Toda venta/cuenta por cobrar y su cobro se relacionan; cobrar NO contabiliza ingresos duplicados.
- Compras a inventario se reconocen de acuerdo con política de costos; consumo convierte existencia en gasto según reglas apropiadas.
- Traslados entre fincas de una empresa se registran como transferencia de existencias/activos y no como facturación ficticia.
- Para movimientos entre entidades legales diferentes, determinar tratamiento comercial/tributario real.
- Soportar Bs. y USD, tasa histórica explícita, reporte por período, conciliación, aprobaciones y auditoría.
- **No equivaler utilidad a saldo de caja.** Reportar por separado flujo de caja, resultado devengado, margen bruto, resultado operativo, CxC, CxP y deuda.
- Tratar existencias ganaderas/activos biológicos mediante política contable definida con un profesional; evitar ganancias artificiales por nacimientos o variación de precio no realizada.
- Revisar requisitos SENIAT y tributarios vigentes antes de emitir facturas fiscales automatizadas.

## 8. Inventarios, activos, recursos humanos

- Insumos por finca/almacén: alimentos, vacunas/medicinas por lote y caducidad, combustible, repuestos, herramientas y materiales.
- Kardex de entradas/salidas, traslados duales, consumos desde jornadas, existencias mínimas y proveedores.
- Activos fijos: bombas, cercas, maquinaria, vehículos, mantenimiento, costos, depreciación si la contabilidad lo requiere.
- Personal: identidad sensible privada, cargo, asignación a fincas, turnos/jornadas, costo, adelantos y asistencia. No confundir empleado con usuario autenticado.
- Compras: solicitud -> aprobación -> recepción -> inventario/CxP -> pago; ventas: pedido -> documento -> entrega/movilización -> CxC -> cobro.

## 9. Experiencia de usuario

**Panel empresa:** comparativo de todas las fincas, cifras consolidadas, alertas y selector de finca.

**Panel finca:** resumen KPI, documentos/hierros, ganado, operaciones, inventario, personal, finanzas, cuentas por cobrar/pagar y reportes. Móvil con tarjetas compactas y acciones rápidas, escritorio con tablas y filtros.

La página actual de edición de finca permanece. El botón “Administrar finca” puede abrir el nuevo centro individual, con “Editar ficha” por separado. Los módulos no terminados deben figurar “En preparación”; nunca mostrar cifras financieras inventadas.

## 10. Seguridad y gobernanza

- Continuar usando Clerk y \`Tenant\` actuales; añadir RBAC por finca, roles como propietario, admin, encargado, contabilidad, veterinario, personal e inspector de lectura.
- **Todas** las nuevas consultas y mutaciones deben comprobar \`tenantId\`, \`farmId\` y permiso; no confiar en IDs desde el navegador.
- Documentos personales, RIF, contratos, datos bancarios y nómina privados por defecto, con auditoría de acceso y descargas.
- Migraciones aditivas con respaldos, índices, integridad referencial, pruebas y reversibilidad. No borrar fincas, usuarios ni animales históricos.
- Eventos de negocio trazables, fechas, fuente y actor; idempotencia para sincronización offline e importaciones.
- La IA primero genera reportes **con evidencia**; cambios financieros, sanitarios o regulatorios requieren aprobación humana.

## 11. Roadmap prioritario

### Fase 0 — Núcleo sin migración destructiva
- Nuevo panel **por finca** con datos reales existentes, accesos y módulos previstos.
- Preservar edición, fotografías, usuarios y jornadas.
- Especificar reglas de titularidad, documentos y RBAC.

### Fase 1 — Base jurídica y organización
- Modelo \`LegalParty\`, expedientes, hierros, farm-scoped memberships y archivo privado.
- Migrations aditivas, permisos, validaciones, pruebas de aislamiento.

### Fase 2 — Finanzas prácticas
- Gastos e ingresos registrados por finca y centro de costo.
- Terceros, proveedores, clientes, compras, CxP, CxC, pagos, bancos, presupuesto.
- Tasa histórica, conciliación y reportes económicos.

### Fase 3 — Producción integral
- Inventarios, almacenes, empleados, activo fijo, tareas, potreros, costos ligados a jornadas.
- Ampliación de genealogía, reproducción, movimiento y producción láctea/cárnica.

### Fase 4 — Documentos de movilización y reportes
- Expedientes por movimiento y documentación oficial externa; alertas de vigencia.
- Análisis de márgenes por finca, actividad, lote y animal; reportes exportables.

### Fase 5 — IA y offline
- Ingesta estructurada y autorizada de datos; reportes explicables con enlaces a registros.
- Captura offline real, colas de sincronización y resolución de conflictos.
- Modelos predictivos validados con datos históricos suficientes.

## 12. Aceptación mínima antes de declarar ERP operativo

1. Empresa A nunca puede acceder a finca de empresa B; en fases con permisos granulares, usuario solo accede a fincas autorizadas.
2. Agregar documentos y hierros no reemplaza ni expone los archivos de otras entidades.
3. Un animal conserva historial, genealogía y vínculo a su finca; movimientos actualizan la ubicación sin perder origen.
4. Se registra una venta a crédito, una cobranza parcial y el saldo correcto sin duplicar ingresos.
5. Se registra una compra, entrada a inventario, consumo y gasto sin duplicar costos.
6. Transferencias entre fincas se concilian por origen/destino.
7. Reportes distinguen ingreso, gasto, utilidad y efectivo; períodos y monedas verificables.
8. Todas las operaciones sensibles incluyen permisos, auditoría y pruebas de error.
9. Los datos incompletos aparecen como “Sin registrar”, nunca como 0 o utilidad calculada falsamente.
10. Funcionalidad móvil, escritorio y PWA validada; offline real solo cuando esté probado.

**Nota:** esta especificación es un plan técnico/producto. No representa que todos los módulos estén implementados.