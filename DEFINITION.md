# fastwebmcp — Definición

## Qué es

fastwebmcp es una librería TypeScript que da a WebMCP la ergonomía de FastMCP: builders tipados con Zod sobre las APIs Imperativa y Declarativa del navegador, con degradación segura cuando `document.modelContext` no está disponible.

## Arquitectura

Core reusable (`fastwebmcp`, paquete npm) + dos pieles que lo consumen:

- **Core:** el builder tipado y las utilidades de la API Declarativa, más la capa de detección de soporte/fallback compartida por ambas rutas.
- **Harness de testing/debug:** mockea `document.modelContext` en Node para invocar y verificar tools sin navegador real ni depender del panel WebMCP de Chrome DevTools.
- **Examples/demos:** apps de muestra que consumen el core, verificadas contra el panel WebMCP de Chrome DevTools.

## Capacidades objetivo

- Builder tipado (Zod) para tools Imperativas: nombre, descripción, input schema y handler, normalizados para `document.modelContext.registerTool()`, con inferencia de tipos TS de punta a punta (sin `any`).
- Validación/generación de anotaciones WebMCP Declarativas sobre `<form>`.
- Detección de soporte de WebMCP en runtime: no-op silencioso + warning en consola cuando `document.modelContext` no existe.
- Harness que invoca y verifica tools sin necesitar un navegador real.
- Demos ejecutables, verificados contra el panel WebMCP de Chrome DevTools.
- Exportar el schema de un `DefinedTool` (name/description/inputSchema, ya derivados de Zod) como fuente de skill para `mcpwasm` (github.com/MauricioPerera/mcpwasm) — sin intentar portar el `execute`, imposible entre DOM y el sandbox QuickJS-wasm sin DOM de mcpwasm (verificado contra su código real, no adivinado). No reimplementa el CLI oficial de mcpwasm.

## Por qué es un caso válido / motivación real

WebMCP solo tiene origin trial (Chrome 149); los ejemplos oficiales usan `document.modelContext.registerTool()` crudo, sin validación de schema, sin tipado y sin red de seguridad si el navegador visitante no soporta la API. No existe todavía un equivalente a lo que FastMCP fue para MCP. El objetivo es publicarlo como paquete OSS de referencia para la comunidad, no solo como caso de estudio de la metodología.

## Fuera de alcance

- No es un puente WebMCP↔MCP por red — no hay lado servidor.
- No es un polyfill de `document.modelContext`: el harness mockea la API para tests, no simula el comportamiento de un agente real.
- Sin bindings de framework (React, Vue, etc.) en esta definición.
- El nombre exacto del paquete npm, la estructura de carpetas y el diseño detallado de la API (firmas de funciones) se deciden en los task contracts, no acá.
