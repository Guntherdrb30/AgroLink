# GanadIA AI Elite - PRD Maestro 001
Version 1.0 | 24 octubre 2026 | Trends172Tech

## Objetivo
Convertir el agente flotante de GanadIA en un asistente OpenAI adaptativo, humano y seguro. La continuidad del chat actual es distinta de la memoria persistente. El sistema consulta el ERP actualizado y aprende preferencias opt-in por persona y empresa, sin entrenar modelos independientes ni mezclar clientes.

## Alcance y aceptación
1. Identidad autenticada: obtener nombre desde Clerk/User, empresa, rol y fincas. Alias manual opcional.
2. Interfaz: lenguaje natural para ganaderos no técnicos, respuestas breves o detalladas según preferencia y sin simulacion de acciones.
3. Historial: conversaciones conservadas en la base actual, independientes de la memoria.
4. Memoria personal: opt-in individual, preferencias aprobadas, caducidad opcional, alcance de finca, fuente del dato, editar/eliminar/exportar.
5. Memoria empresarial: procedimientos que administradores escriben con alcance por empresa y finca; nunca memorias privadas de empleados compartidas.
6. Patrones: señales agregadas de los temas consultados, nunca diagnosticos de personalidad ni vigilancia de personal. El usuario puede borrarlas.
7. Sugerencias OpenAI: extraction structured, solo cuando se habilita conscientemente, siempre sujetas a cuotas y confirmacion humana.
8. Consola de recuerdos: activar/desactivar memoria y aprendizaje, estilo, alias, propuesta/aprobacion, borrado por recuerdo y total.
9. Seguridad: tenant+user+role+farm grants, registros limitados y datos de terceros privados; verificaciones antes de cada uso de memoria.
10. Privacidad: no guardar contrasenas, API keys, documentos de identidad, cuentas, informacion medica, atributos sensibles u otros datos privados de compradores. Recuerdos tratados como datos no instrucciones.
11. ERP: pesajes, ventas, gastos, sanidad y guias se consultan en tiempo real; recuerdos nunca sustituyen fuentes.
12. Pruebas: aislamiento, revocacion de acceso, consentimiento, borrar chat vs borrar memoria, coste, casos ambiguos, respuestas no tecnicas y UX movil.
13. Reutilizacion: un modulo de motor/politicas independiente del dominio GanadIA, persistencia Neon y proveedor OpenAI.
14. Produccion comercial: dominio, consentimiento, privacidad, pruebas autenticadas de varias empresas, monitoreo, respaldo, seguridad, facturacion y documentacion.

## Estados de recuerdos
SUGGESTED -> ACTIVE tras aprobar, o DISMISSED. Solo ACTIVE entra en respuestas. Origen MANUAL/EXPLICIT/PATTERN/OPENAI. Ningun aprendizaje automatico hasta habilitar las preferencias; activar implica consentimiento reversible.

## Fases de aplicacion
E0 Auditoria arquitectura y PRD.
E1 Esquema segregado y politicas.
E2 Servicio memoria personal y empresarial, controles de usuario.
E3 Contexto de identidad y preferencias en OpenAI Responses API.
E4 Sugerencias de patrones y OpenAI sin exceder presupuesto piloto.
E5 Pruebas de privacidad, uso autentico, observabilidad y preparacion para lanzamiento.
No considerar completo antes de validar E5; READY de Vercel no prueba funcionalidad de memoria.

## Siguiente ERP (fuera de alcance de este modulo)
B. Venta de activos fijos e inventario: tractores, equipos y herramientas. Revisar modelo ERP, contabilidad, costes, autorizaciones y la baja transaccional. Crear PRD propio y validar antes de codigo.
C. Produccion y venta de leche: ordeño diario, litros, tanques, mermas, calidad, facturacion y clientes. Pospuesto por solicitud expresa, PRD propio posteriormente.

## Reglas no negociables
No modificar permisos por memoria. No inferir automaticamente datos sensibles. Ningun gasto fuera del piloto aprobado. No eliminar historial ni animales durante cambios de memoria. No confundir documento interno con guia INSAI. No declarar producto comercial listo solo por compilacion.
