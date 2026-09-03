# TESTING-PARITY-REPORT.md

Fecha: 2026-09-03
Branch: `feature/atomic-validation-and-testing-helpers`

## Cambios (solo 3 archivos de producto)

1. `src_ts/define-declarative-tool.ts` — `defineDeclarativeTool` ahora valida con el
   mismo `NAME_PATTERN = /^[A-Za-z0-9_.-]{1,128}$/` que `defineTool` (lanza con mensaje
   claro si no coincide) y emite advertencias no bloqueantes `warnIfOverBudget` para
   `NAME_BUDGET = 30` y `DESCRIPTION_BUDGET = 500` (recomendaciones de Chrome para
   WebMCP). Las validaciones de string no vacío se conservan primero, así como el
   orden fail-fast antes de cualquier `setAttribute` (compatibilidad 100%).
2. `src_ts/testing.ts` — nuevos helpers exportados:
   - `withMockDocument<T>(mock: WebMcpMock, fn: () => T): T` — instala
     `mock.document` en `globalThis.document` y lo restaura en `try...finally` vía
     `Object.defineProperty` (restaura el descriptor original o borra la propiedad si
     no existía).
   - `createMockAgentSubmitEvent(): MockAgentSubmitEvent` — evento de submit de agente
     para formularios declarativos (`agentInvoked: true`) que captura la promesa pasa-
     da a `respondWith()`; `waitForResponse()` la devuelve (o rechaza con error claro
     si `respondWith` nunca fue llamado).
3. `src_ts/index.ts` — re-exporta `withMockDocument`, `createMockAgentSubmitEvent` y el
   tipo `MockAgentSubmitEvent` (además de los ya existentes).

Sin dependencias externas. `tests_ts/` y `knowledge/contracts/` intactos.

## Salida real de los comandos de verificación

### 1. `node --test tests_ts/define-declarative-tool.test.ts`

```
✔ sets toolname and tooldescription on the form (0.5644ms)
✔ does not set toolautosubmit when autoSubmit is omitted (0.0997ms)
✔ sets toolautosubmit (presence-only, empty string value) when autoSubmit is true (0.0667ms)
✔ sets toolparamdescription on the matching field by name (0.1101ms)
✔ throws when a field name has no matching form control (0.2509ms)
✔ throws when name is an empty string (0.0743ms)
✔ throws when description is an empty string (0.0764ms)
✔ never calls setAttribute on the form for name/description before validating both (0.0727ms)
ℹ tests 8
ℹ suites 0
ℹ pass 8
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 105.2641
```

### 2. `node --test tests_ts/testing.test.ts`

```
✔ exposes a document shaped object with modelContext.registerTool (0.6087ms)
✔ invokeTool runs the real registered handler end to end via registerTool() (3.046ms)
✔ invokeTool rejects with a clear error when no tool is registered under that name (0.7004ms)
✔ invokeTool provides a default AbortSignal when the caller does not pass one (0.6472ms)
✔ invokeTool forwards a caller-provided signal unchanged (0.2892ms)
✔ two tools registered on the same mock do not cross-contaminate (0.414ms)
ℹ tests 6
ℹ suites 0
ℹ pass 6
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 145.0314
```

### 3. `npm test`

```
> fastwebmcp@0.4.2 test
> node --test tests_ts/**/*.test.ts

✔ sets toolname and tooldescription on the form (1.5408ms)
✔ does not set toolautosubmit when autoSubmit is omitted (0.2751ms)
✔ sets toolautosubmit (presence-only, empty string value) when autoSubmit is true (0.1859ms)
✔ sets toolparamdescription on the matching field by name (0.2025ms)
✔ throws when a field name has no matching form control (0.4291ms)
✔ throws when name is an empty string (0.1365ms)
✔ throws when description is an empty string (0.1167ms)
✔ never calls setAttribute on the form for name/description before validating both (0.0967ms)
✔ returns a normalized tool with name, description and a JSON Schema inputSchema (5.4424ms)
✔ throws when name is an empty string (0.4221ms)
✔ throws when name is missing whitespace-only (0.1316ms)
✔ throws when description is an empty string (0.186ms)
✔ throws when execute is not a function (0.1385ms)
✔ the wrapped execute parses valid input and forwards it to the handler (1.4223ms)
✔ the wrapped execute rejects when raw input fails schema validation (0.8119ms)
✔ the wrapped execute forwards the AbortSignal context unchanged (0.2789ms)
✔ passes annotations through to the returned tool when provided (0.2229ms)
✔ omits annotations from the returned tool entirely when not provided (0.2501ms)
✔ passes title through to the returned tool when provided (0.1725ms)
✔ omits title from the returned tool entirely when not provided (0.1452ms)
✔ throws when name contains a character outside [A-Za-z0-9_.-] (0.115ms)
✔ throws when name exceeds 128 characters (0.0788ms)
✔ warns (without throwing) when name exceeds the 30-character budget Chrome recommends (0.2877ms)
✔ warns (without throwing) when description exceeds the 500-character budget Chrome recommends (0.1694ms)
✔ does not warn for a name and description within budget (0.1545ms)
✔ TOOL 1 (Imperativa): calculate_cart_total - calculo exitoso y validacion Zod (8.2474ms)
✔ TOOL 2 (Declarativa): flight_search_form - anotacion, atomicidad y agente submit (0.8782ms)
✔ CICLO DE VIDA: mock.reset() limpia estado y aisla pruebas (0.5152ms)
✔ DESREGISTRO: options.signal abort desregistra la tool del mock (0.274ms)
✔ returns false and warns (without throwing) when WebMCP is not supported (1.9294ms)
✔ calls document.modelContext.registerTool and returns true when supported (0.3261ms)
✔ forwards options (signal, exposedTo) unchanged as the second argument (0.2155ms)
✔ throws on an invalid spec even when WebMCP is unsupported (fails fast, never silently no-ops a bug) (0.4378ms)
✔ throws on an invalid spec when WebMCP IS supported, before ever calling the real registerTool (0.1828ms)
✔ returns false and never calls respondWith when agentInvoked is false (0.7456ms)
✔ returns true and calls respondWith exactly once when agentInvoked is true (0.18ms)
✔ the promise passed to respondWith resolves to the handler return value (1.161ms)
✔ the promise passed to respondWith resolves to the handler return value even when the handler is async (0.2038ms)
✔ a synchronous throw inside the handler rejects the promise instead of escaping (0.8212ms)
✔ the handler receives the event itself as its argument (0.187ms)
✔ returns true when document.modelContext is an object (1.1659ms)
✔ returns false when document.modelContext is undefined (0.2301ms)
✔ returns false when document.modelContext is null (0.153ms)
✔ returns false when document itself does not exist (0.122ms)
✔ returns false when document.modelContext is not an object (e.g. a string) (0.188ms)
✔ never throws even with a weird document shape (0.3301ms)
✔ exposes a document shaped object with modelContext.registerTool (0.5193ms)
✔ invokeTool runs the real registered handler end to end via registerTool() (2.811ms)
✔ invokeTool rejects with a clear error when no tool is registered under that name (0.3093ms)
✔ invokeTool provides a default AbortSignal when the caller does not pass one (0.3025ms)
✔ invokeTool forwards a caller-provided signal unchanged (0.2253ms)
✔ two tools registered on the same mock do not cross-contaminate (0.2616ms)
✔ emits a registerTool({...}) call with the tool name and description as JSON strings (0.6675ms)
✔ embeds the JSON Schema derived by defineTool(), not a re-declared one (0.572ms)
✔ defaults to a TODO stub handler mentioning the sandbox constraints (0.105ms)
✔ embeds a caller-provided handlerBody verbatim instead of the default stub (0.0959ms)
✔ output is syntactically valid JavaScript (compiles as a function body without throwing) (0.1761ms)
✔ escapes special characters in description safely (quotes, backslash, newline) (0.4418ms)
✔ handler is declared as a plain method (works for both sync and async handlerBody text) (0.1521ms)
ℹ tests 59
ℹ suites 0
ℹ pass 59
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 248.9016
```

### 4. `npm run typecheck`

```
> fastwebmcp@0.4.2 typecheck
> tsc --noEmit

(exit code 0 — sin errores de TypeScript)
```

### 5. `python scripts/validate_contracts.py knowledge/contracts`

```
OK: todos los contratos son validos

Resumen: 0 error(es), 0 warning(s) en 32 archivo(s)
```

## Resultado

| Verificación | Resultado |
| --- | --- |
| `node --test tests_ts/define-declarative-tool.test.ts` | 8/8 pass, 0 fail |
| `node --test tests_ts/testing.test.ts` | 6/6 pass, 0 fail |
| `npm test` | **59/59 pass, 0 fail** |
| `npm run typecheck` | 0 errores |
| `python scripts/validate_contracts.py knowledge/contracts` | 0 errores, 0 warnings |