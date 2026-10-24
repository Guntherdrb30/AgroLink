# GanadIA — Guía Interna Premium de Movilización y Venta
**PRD-GI-001 · v1.0 · 24-10-2026 · Trends172Tech**

## 1. Objetivo y límites
El agente conversacional y el módulo Ventas deben preparar, consultar, imprimir y conservar una **guía interna** premium para venta/salida de ganado bovino. El borrador no modifica existencias; la **confirmación expresa** de la venta ejecuta una transición transaccional a SOLD y conserva pesos, eventos y trazabilidad. El permiso oficial de movilización emitido por INSAI/SIGESAI y la factura fiscal, cuando correspondan, son documentos separados; la guía interna no los sustituye.

La referencia visual aprobada emplea fondo blanco, verde profundo, cabecera con marca GanadIA + logo de la finca + hierro, QR de verificación autenticada, folio, secciones numeradas, tabla individual y firmas. Los datos de ejemplo de la imagen son ficticios y no deben trasladarse a operaciones reales.

## 2. Actores y autorización
- TENANT_OWNER, TENANT_ADMIN y FARM_MANAGER con acceso explícito a la finca: preparan borradores, gestionan hierro y confirman ventas.
- ACCOUNTING con acceso: consulta recibos e historial, sin confirmar ventas.
- Otros roles: sin acceso al documento comercial salvo políticas específicas futuras.
- Toda consulta y mutación filtra por tenantId, userId y finca autorizada; las páginas QR requieren sesión. Nunca introducir datos personales de compradores en una URL pública.

## 3. Datos del comprobante
**Cabecera**: folio único, estado, fecha y hora, logo corporativo GanadIA, logo de finca (si disponible), hierro registrado o pendiente, QR de verificación, nota de documento interno.

**Origen**: finca, propietario/razón social, RIF o cédula, identificación del hierro, dirección de origen, teléfono/contacto, ubicación.

**Comprador/destinatario**: nombre/razón social, cédula o RIF, dirección fiscal, teléfono, correo opcional, persona de contacto, destino.

**Movilización proyectada**: motivo, ubicación de salida y recepción, ruta, fecha/hora prevista, vehículo, placa, conductor, documento y teléfono.

**Ganado**: identificación individual, sexo, peso usado, fuente de peso (último pesaje o ficha), fecha del último pesaje; total animales, kilogramos, promedio. La proyección no puede presentarse como pesaje real. Campos de raza, edad, potrero, sanidad y trazabilidad podrán ampliarse sobre el modelo Animal, sin falsear ausencias.

**Control**: anotaciones sanitarias, referencia al soporte oficial INSAI adjunto, precio/kg, moneda, importe, condiciones de pago, responsables, firmas y estado.

## 4. Flujo de conversación
1. El usuario pide una guía en lenguaje natural; GanadIA identifica finca, criterio por peso individual, cantidad o kilos objetivo.
2. Consulta exclusivamente animales ACTIVE de fincas autorizadas y últimos pesajes con fecha.
3. Presenta propuesta con códigos, cantidad, kilos medidos, diferencia frente al objetivo y limitaciones.
4. Solicita comprador y cédula/RIF, domicilio, contacto, destino y datos de movilización. Nunca inventa datos faltantes.
5. Solicita autorización expresa para **crear borrador**. El borrador es persistente, tiene folio, PDF y QR; no descuenta ganado.
6. Una acción separada **confirmar venta**, con permisos y confirmación, marca cada animal SOLD, registra eventos/auditoría y evita dobles ventas de forma atómica.
7. El soporte INSAI se adjunta por separado, con permisos. Solo el permiso oficial autoriza el traslado.

## 5. Estados y reglas
- Implementado: DRAFT → CONFIRMED. QR presenta el estado actual y no concede acceso anónimo.
- Estado visual DRAFT: "Borrador pendiente de autorización"; CONFIRMED: "Venta confirmada".
- Futuro sujeto a validación: autorización multietapa, impresiones auditadas, emisión fiscal, anulaciones/reversos.
- Si no están completos los datos, PDF señala "Pendiente". No simula firmas, sellos sanitarios, registros oficiales ni constancias.
- El QR está ligado a un token aleatorio no derivado del ID; la pantalla exige sesión y alcance de finca; no contiene datos personales.
- La revisión sanitaria y guía oficial son independientes de la venta interna.

## 6. Modelo técnico MVP
- Farm.ironCode, Farm.ironFileId: referencia al hierro opcional; imágenes guardadas privadas.
- LivestockSale.guideData: mapa validado de detalles del cliente, origen, destino y transporte; LivestockSale.verificationToken: token 256 bits único.
- LivestockSaleItem: snapshots de códigos, sexo, peso, fuente y fecha. Es necesario para preservar un recibo aunque el ERP cambie después.
- GET /api/livestock-sales/:id/receipt: PDF numerado multipágina; token QR a /guias/verificar/:token.
- /guias/verificar/:token: vista autenticada, verificación de titularidad, permisos y estado; puede descargar PDF.
- POST /api/farms/:farmId/iron: PNG/JPG privado y/o código de hierro, sin acceso entre fincas.
- POST /api/livestock-sales: borrador idempotente, sin descuento.
- POST /api/livestock-sales/:id: confirmación transaccional, sin duplicaciones.

## 7. Criterios de aceptación
- Documento multipágina imprimible, sin corte de información por cada animal.
- Folio, marca, logo/hierro disponibles y QR escaneable con destino exacto.
- La vista QR rechaza visitantes sin sesión o permisos.
- El agente pregunta datos del comprador, evita respuestas técnicas y no genera permisos oficiales.
- PDF muestra comprador, identificación, domicilio, destino, transporte, ganado individual y controles.
- Las ventas de prueba no se confirman automáticamente y los datos de inventario previos se conservan.
- Construcción de Vercel sin errores y prueba autenticada del flujo completo antes de declarar aceptación funcional.

## 8. Riesgos y mejoras posteriores
- PDF-lib incrusta imágenes PNG/JPEG; logo WEBP necesita conversión autorizada para imprimirse.
- La inspección/validez de requisitos sanitarios exactos depende de normativa vigente y datos verificados con INSAI; NO inferir cumplimiento sanitario del estado del ERP.
- Para documentos con efectos comerciales reales, revisar fiscalidad, requisitos de movilización y políticas de conservación documental con asesoría local.
- Futuros módulos: CRM de compradores, plantillas INSAI formalmente validadas, firma electrónica, exportaciones y aprobaciones multinivel, historial de impresiones, revocación/rotación del QR.

## 9. Historial de implantación (24/10/2026)
Se aplicaron columnas aditivas y tipo de medio FARM_IRON en Neon; se incorporaron generador PDF multipágina, ruta privada de verificación QR, formulario de guía, colección conversacional de datos y carga segura de hierro. Aprobación funcional de punta a punta pendiente de prueba autenticada; no se deben inventar resultados de esa prueba.
