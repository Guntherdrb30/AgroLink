# GanadIA | Crea tu Finca - PRD 001
Version 1.0, 24 octubre 2026, Trends172Tech

## Objetivo
Crear una finca mediante conversacion natural y propuesta productiva aprobada. El usuario explica su actividad, el agente pregunta lo necesario, analiza objetivos y recomienda modulos operativos ya implementados. El propietario revisa y autoriza la creacion real.

## Alcance
- Pantalla dedicada "Crea tu Finca" mas modo manual existente.
- Sesion privada del asistente y borradores persistidos por empresa y usuario.
- Preguntas adaptativas: vision de finca, nombre, ubicacion, superficie, proposito (cria, engorde, leche, doble proposito, agricultura, mixto), inventario declarado, infraestructura, objetivos.
- Extraccion de datos declarados con OpenAI, controlada por el presupuesto piloto vigente; alternativa asistida cuando la cuota no permite una llamada.
- Plan aprobado guardado en un perfil operativo por finca, independiente de la memoria personal opt-in.
- Modulos ya existentes: ganado, sanidad, reproduccion, jornadas, geografia, potreros, ERP, inventario, gastos y ventas; futura produccion diaria de leche se indica como planificada, no activa.
- Revision editable y confirmacion humana expresa. En una transaccion: alta finca, perfil productivo, verificacion pendiente, registro de auditoria y cambio de estado de la sesion.
- Sin crear animales, activos, gastos, potreros fisicos, pesos, capacidad animal/ha ni documentos ficticios.
- Permisos Clerk tenant, roles, controles de concurrencia e idempotencia. Nada se modifica en fincas preexistentes.
- Pruebas de clasificacion, validacion, roles, duplicados, fallos de IA, cuota, y pantalla movil.
- Listo para comercializacion solo tras validacion autenticada y pruebas de extremo a extremo.

## Reglas
Doble proposito se refiere a carne y leche, no al sexo de los animales. Sin estudio de pastos, agua y condiciones no certificar capacidad de carga. Los permisos INSAI son oficiales y se adjuntan por separado. Las operaciones reales del ERP no son sustituidas por sugerencias de IA.

## Aplazado
Venta de maquinaria/activos y produccion y venta diaria de leche son desarrollos separados, sin mezclarlos con el alta de finca.
