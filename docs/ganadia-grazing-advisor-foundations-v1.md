# GanadIA — Asesor de fundaciones y pastoreo (piloto técnico)

Fecha: 20/10/2026. Implementación inicial dentro de Mapa y GPS, sin APIs de IA de pago.

## Contexto venezolano

Un hato ganadero de los llanos puede organizarse en **fundaciones**, es decir, sectores/unidades operativas internos, con administración, personal, instalaciones y ganado propios. La entrevista comienza preguntando cuántas fundaciones maneja la finca y permite asignar múltiples grupos por fundación. No confundir fundaciones con compañías jurídicamente independientes ni con potreros.

Cada fundación puede tener una zona georreferenciada propia de tipo `FOUNDATION` en `FarmGeoArea`. La pantalla de mapa permite dibujarla, medirla y editarla; también pueden estudiarse fundaciones aún no dibujadas usando superficies declaradas, claramente diferenciadas de mediciones en el mapa.

## Motor experto — variables

Por fundación:

- Nombre, hectáreas, porcentaje de área utilizable, propósito (ceba, cría, leche o doble propósito).
- Temporada declarada: verano, invierno o transición, riesgo de inundación.
- Producción estimada/medida de materia seca (kg MS/ha), porcentaje utilizable del forraje.
- Grupos con cabezas, categoría, peso promedio, consumo de materia seca como porcentaje del peso vivo, días de descanso y ocupación.
- Existencia y **ubicación opcional en el mapa** de casa, corral, agua y accesos.

Reglas de cálculo inicial:

1. Demanda de MS/día = cantidad × peso vivo promedio (kg) × consumo (%) / 100.
2. Número preliminar de potreros (grupo único y rotación secuencial) = techo(descanso/ocupación) + 1.
3. Área aproximada por potrero = consumo diario MS × días de ocupación / (kg MS/ha disponibles × fracción aprovechable).
4. Área aproximada de rotación = área por potrero × número de potreros.
5. Se presentan cálculos **por fundación y consolidados**, distinguiendo supuestos de datos reales. No se asume que todos los grupos compartan potreros.
6. Si falta el aforo, devolver resultado de **capacidad NO DETERMINABLE**; no asignar animales/ha ni prometer sustentabilidad.
7. Marcar advertencias si falta el agua, casa/corral, si hay inundación o si el área teórica supera la superficie disponible.

Las fórmulas no calibran el crecimiento real de forraje por estación, suelo ni especie. Requieren prueba en campo y revisión por especialista venezolano antes de invertir o realizar traslados.

## Visualización geográfica

El prototipo puede dibujar **sectores orientativos**, nunca convertirlos silenciosamente en potreros registrados:

- Solo polígonos **convexos, válidos, georreferenciados**, entre 2 y 20 sectores.
- División iterativa por franjas de área aproximadamente equivalente con corte geográfico.
- Comparar dos orientaciones, estimar longitud relativa de cercas y penalizar divisiones cercanas a puntos de casa/corral.
- Marcar posiciones de casa, corral, agua, acceso por clic.
- Si el terreno es irregular o faltan referencias, mostrar limitación, sin prometer diseño.
- No asumir que se conoce relieve, drenaje, tipos de pastura ni caminos cuando el usuario no los ha registrado.
- Todo bosquejo es **editable/revisable**; no es plano de obra, deslinde legal ni orden de ejecución.

## Persistencia, seguridad, consumo

- Nueva tabla aditiva `FarmGrazingPlan` con `tenantId`, `farmId`, entrada y salida JSON, versión, actor y fecha. No altera inventario ni partidas administrativas.
- Guardado solo roles TENANT_OWNER, TENANT_ADMIN y FARM_MANAGER.
- Lectura protegida por sesión y pertenencia del usuario a la empresa. Antes de accesos por finca granulares hay que implementar RBAC `farmId`.
- Validación completa de entradas en el servidor; comprobar que IDs de polígono de fundación sean de **la misma finca y empresa**, usando área medida por servidor.
- Historial de estudios; cada guardado agrega nueva versión de escenario en lugar de alterar estudios anteriores.
- Sin llamadas pagas a LLM; no se representa como un agente generativo ya desplegado.
- Datos de instalaciones GPS son sensibles y se guardan en los estudios solo después de pulsar Guardar.

## Camino a agente generativo completo

1. Explicación de resultados con enlaces a datos verificables, objetivos y limitaciones.
2. Opcional: herramienta de conversación libre mediante un modelo autorizado, con presupuesto de consumo y consentimiento explícito.
3. GIS validado: puntos de agua, pendientes, inundación, NDVI y aforos reales en etapas, sin afirmaciones no respaldadas.
4. Optimizador de diseño sujeto a restricciones y rutas practicables, respetando perímetros legales, accesos, ubicación del corral y áreas excluidas.
5. Simulación estacional por fundación y rotación real de grupos con inventario trazable; comparar costo de cercas, mano de obra, suplementos y producción.

## Verificaciones antes de usar planes en campo

- Recuento y nombres de fundaciones correctos.
- Área sumada de fundaciones compatible con superficie declarada del hato.
- Grupos de animales identificados y pesados, incluida densidad y conversión.
- Medición de forraje/agua y fecha de referencia por estación; verificar verano/invierno.
- Casa, corrales, mangas, cercas existentes, puntos de agua, accesos, bajos y lugares inundables georreferenciados.
- Propuesta GIS comprobada visualmente con el usuario y validada por agrónomo/zootecnista local.
- Probar creación, lectura, edición de área, validaciones, permisos y retorno desde PWA móvil.

Fuentes técnicas de referencia:
- FAO pastoreo rotacional y manejo de pasturas.
- Extension de universidades agrícolas sobre cálculo de potreros y materia seca.
- Leaflet Quick Start (CDN e integridad correctas): https://leafletjs.com/examples/quick-start/
