# GanadIA — GIS para fincas y Laboratorio de Simulaciones (V1)

**Fecha:** 2026-10-20. **Estado:** MVP con geolocalización y simulaciones ilustrativas. Arquitectura avanzada pendiente de nuevas fases. **Ámbito:** empresa (Tenant) → varias fincas → distintas actividades productivas.

## Hallazgos verificables del producto

En `prisma/schema.prisma` la finca ya tiene `latitude`, `longitude`, `hectares` y una relación con `Tenant`. Los animales ya tienen `farmId` y una relación con eventos de tipo `TRANSFER`, pero no existe un libro de movimientos completo con recepción, origen y destino, historial de tenencia o documentos asociados. Tampoco hay polígonos geográficos ni un modelo de lotes porcinos.

## 1. Cartografía abierta: investigación de GitHub

| Proyecto | Uso | Repositorio | Nota |
|---|---|---|---|
| MapLibre GL JS (BSD-3-Clause) | mapas vectoriales, satélite combinado, relieve/3D | https://github.com/maplibre/maplibre-gl-js | necesita teselas/base cartográfica con licencia y disponibilidad adecuadas |
| Turf.js (MIT) | áreas, perímetros, distancias, punto en polígono, buffers | https://github.com/Turfjs/turf | cálculo en frontend y validación en backend |
| Terra Draw (MIT) | dibujo y edición de límites y potreros | https://github.com/JamesLMilner/terra-draw | exportar GeoJSON válido |
| PMTiles (BSD-3-Clause) | cartografía vectorial autocontenida desde CDN/storage | https://github.com/protomaps/PMTiles | permite servir mapas sin servicios de pago por visualización; no implica que infraestructura no tenga costo |
| farmOS (GPL-2.0-or-later) | referencia de diseño para trazabilidad agrícola y registros de campo | https://github.com/farmOS/farmOS | estudiar conceptos, no copiar código de forma incompatible sin revisión de licencia |

**Atención a términos de teselas de OpenStreetMap:** El visor inicial usa un `iframe` del sitio de OpenStreetMap activado **solo cuando el usuario pulsa Cargar mapa**. Esto es exclusivamente una fase piloto; no diseñar un SaaS con alto volumen sobre teselas estándar públicas sin revisar https://operations.osmfoundation.org/policies/tiles/. Para producción a escala usar teselas propias/licenciadas, PMTiles y política de atribución de cada fuente.

**Datos satelitales:** Copernicus/Sentinel-2 ofrece bandas de 10 m (otras de 20 y 60 m) y archivos de acceso abierto, con limitaciones meteorológicas/nubosidad. Servir para análisis de vegetación, no afirmar que permite leer microchips o localizar bovinos individualmente. Referencia: https://dataspace.copernicus.eu/.

## 2. MVP geográfico implementado

- Ruta `/farms/[farmId]/geografia` autentica pertenencia al Tenant antes de devolver cualquier coordenada.
- Representa el **punto** actual de la finca en un mapa OpenStreetMap bajo demanda, nunca finge sus límites.
- Botón para obtener GPS del teléfono **por consentimiento explícito**. No guarda automáticamente la posición.
- Permite llevar la sugerencia de coordenadas al formulario de edición, con revisión y confirmación.
- El GPS del teléfono indica la ubicación del teléfono, **no necesariamente la finca**. Precisión variable; no es certificado catastral.
- La superficie `hectares` registrada no define un polígono legal y no debe confundirse con un área calculada de un plano.

## 3. Próxima arquitectura geoespacial (sujeta a fases)

**Tablas aditivas propuestas:**
- `FarmBoundary`: tenantId, farmId, GeoJSON WGS84 de tipo Polygon/MultiPolygon, origen de la medición, precisión, actor, versión y fecha; referencia legal separada.
- `FarmPaddock`: potrero, especie forrajera, capacidad, superficie calculada, estado, movimiento de ganado.
- `FarmGeoFeature`: puntos de acceso, bebederos, cercas, corrales, caminos, instalaciones, riesgo de inundación, fuentes de agua y reservas.
- `FarmSatelliteObservation`: fuente/fecha, cobertura nubosa, NDVI u otros indicadores, cálculo y metodología.
- `AnimalLocationObservation`: animal, dispositivo físico, precisión, marca de tiempo, tiempo máximo de frescura y permisos.
- `GeoAuditEvent`: actor, cambios antes/después, motivo.

**Validaciones:** coordenadas WGS84 [-90,+90] y [-180,+180], anillos cerrados, polígonos sin autointersección, área geodésica, control de ediciones y acceso `tenantId + farmId`. Considerar PostGIS **solo tras verificar capacidad y costo en Neon**. Para polígonos muy extensos, no confiar en área de pantalla ni en una sola medición telefónica.

**Secuencia propuesta:**
1. GPS punto/persistencia y mapa bajo demanda (MVP).
2. MapLibre + Terra Draw + Turf + teselas permitidas/licenciadas: límites, potreros, superficies, geocercas.
3. Offline selectivo para mapas de la propia finca y sincronización resistente a conflictos.
4. Imágenes Sentinel-2, serie NDVI y alertas agroclimáticas (con fecha de imagen).
5. Dispositivos GPS/LoRaWAN/4G para ubicación **real** de animales, con latencia, batería y cobertura explícitas.

## 4. Multi-finca y movimientos

El mismo dueño puede tener finca A (cría), finca B (ceba) y finca C (cochinera) e incluso actividades mixtas dentro de una sola finca.

No basta con modificar `Animal.farmId`: crear `AnimalTransfer` con tenantId, animalId, fromFarmId, toFarmId, movementDate, motivo, estado `PLANNED/IN_TRANSIT/RECEIVED/CANCELLED`, responsable, referencia sanitaria y documento oficial externo si corresponde; `AnimalTransferEvent` para el historial. Aceptar traslados por lotes. Una transición interna **no es automáticamente una venta**; documentar cuándo sí hay cambio de titular legal. Aplicar recepción + finca actual + asiento de inventario en transacción con idempotencia.

## 5. Producción porcina simplificada

**Dos modalidades con niveles de detalle diferentes:**
- **Cochinera de engorde:** `SwineBatch` con finca, galpón/corral, fecha de entrada, cantidad inicial, peso promedio inicial, costo de compra, muertes, traslados, alimento consumido, pesajes por muestra, cantidad y peso de venta. Fórmula `animales disponibles = entradas + nacimientos/ingresos - muertos - ventas - salidas`. Producción y margen por lote.
- **Cochinera reproductora:** `SwineBreedingFemale` por madre reproductora; servicio/inseminación, gestación, parto, nacidos vivos, nacidos muertos, destetados, mortalidad y asignación a lotes de engorde. Identificación individual obligatoria solo cuando el negocio lo necesita para reproducción o trazabilidad oficial.

**KPIs orientativos:** conversión alimenticia (kg alimento consumido/kg incremento de peso), ganancia diaria promedio, mortalidad por lote, costo por kg, cerdos destetados por madre/año, ocupación de corrales. Evitar usar cifras demostrativas como estándares venezolanos universales. Incluir bioseguridad y sanidad, separar instalaciones cuando aplique y registrar asesoramiento veterinario.

## 6. Motor de inversiones abierto, sin API paga

Motor puro TypeScript `lib/simulations/investment-engine.ts`, con funciones deterministas y reproducibles:
- ceba bovina: cabeza, ciclos, peso inicial/salida, mortalidad, costo de compra, alimentación, venta/kg, costos fijos, infraestructura;
- engorde porcino por lote: mismos campos, con parámetros independientes;
- cría porcina: madres, partos estimados, nacidos vivos, supervivencia, costos de mantenimiento y valor de venta de lechones.
- horizonte, flujos mensuales, ingreso, costo variable/fijo, inversión, saldo neto, valor presente descontado y punto de equilibrio;
- comparación prudente/base/favorable con sensibilidades configuradas;
- distribución experimental (variaciones pseudoaleatorias reproducibles) sin afirmar probabilidades epidemiológicas/financieras reales;
- exportación CSV local desde navegador sin registro en contabilidad, sin gasto de tokens.

**No es un modelo de margen contable auditado.** No contempla deuda, intereses, impuestos, inflación, depreciación ni valor residual de animales/reproductoras, instalaciones y terreno. La cría porcina considera producción esperada uniforme mensual y **no sustituye** programación de gestación/lactancia ni disponibilidad comercial real.

**Licencias y simulación avanzada:** OR-Tools (Apache-2.0) para optimizar compras, dietas, capacidad de corrales, potreros y flujo de caja bajo restricciones; https://github.com/google/or-tools. Mesa (Apache-2.0), https://github.com/projectmesa/mesa, para simulación multiagente (rebaños, potreros, reproducción, enfermedad) solo con parámetros empíricos. El MVP TypeScript no instala estas bibliotecas Python ni consume servidores externos.

**Próximos modelos**: `SimulationScenario` con tenantId/farmId/autor, versión de motor, entradas, supuestos, resultados, moneda y fecha; comparador entre fincas y simulación consolidada. Guardar escenarios **solo con consentimiento expreso**. IA para explicar resultados con referencias a supuestos, no para alterar cifras calculadas arbitrariamente.

## 7. Seguridad y transparencia

- Pantallas privadas verifican tenantId; futuros permisos específicos `farmId` cuando se implementen.
- No exponer coordenadas exactas ni documentos a visitantes, buscadores o terceros sin necesidad/consentimiento.
- El MVP solo envía coordenadas a OpenStreetMap si se pulsa explícitamente Cargar mapa o enlace externo.
- Datos de ejemplo identificados como **demostrativos**, no reales de Barinas/Venezuela.
- Conservar transacciones, animal/finca actuales e historial; no realizar migraciones destructivas.
- Evaluar costo de bases geoespaciales, imagery, tiles y GPS físico por finca antes de compra.

## 8. Criterios de aceptación

1. Propietario entra a su finca, abre el mapa, consulta lat/lon o registra GPS desde su teléfono y confirma datos manualmente.
2. Otra empresa no puede acceder a esa URL para consultar coordenadas.
3. Una finca sin coordenadas muestra un estado informativo, no un marcador falso.
4. Simulaciones no requieren APIs de IA y no escriben facturas ni movimientos.
5. Escenarios cambian coherentemente con mortalidad, precio y costo de alimento.
6. Se puede exportar CSV local; CSV indica que es hipotético.
7. Proyecto de cría porcina distingue madres de animales engordados y muestra la simplificación.
8. MVP de cartografía no promete polígonos, satélite en tiempo real ni GPS de animales sin hardware.
9. La UI funciona en móvil y escritorio y supera compilación de producción.
10. Registrar datos financieros/ganaderos reales en escenarios requerirá modelos y permisos específicos.
