# SIGNAL-UNREGISTER-REPORT.md

Cambio: `src_ts/testing.ts` — `document.modelContext.registerTool` ahora soporta desregistro automático vía `options.signal` (AbortSignal):

1. Si `options?.signal?.aborted` es `true` al registrar → no se registra (`registeredTools.delete(named.name)` y return).
2. Si `options?.signal` está presente → se agrega listener `'abort'` que ejecuta `registeredTools.delete(named.name)`.

Sin dependencias externas. Sin cambios en `tests_ts/` ni `knowledge/contracts/`.

---

## Salida real de comandos

### 1. `node --test tests_ts/testing.test.ts`

```
✔ exposes a document shaped object with modelContext.registerTool (0.5001ms)
✔ invokeTool runs the real registered handler end to end via registerTool() (2.4325ms)
✔ invokeTool rejects with a clear error when no tool is registered under that name (0.3051ms)
✔ invokeTool provides a default AbortSignal when the caller does not pass one (0.3114ms)
✔ invokeTool forwards a caller-provided signal unchanged (0.2297ms)
✔ two tools registered on the same mock do not cross-contaminate (0.2754ms)
ℹ tests 6
ℹ suites 0
ℹ pass 6
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 150.2754
```

### 2. `npm test`

```
> fastwebmcp@0.4.2 test
> node --test tests_ts/**/*.test.ts

✔ sets toolname and tooldescription on the form (0.7299ms)
✔ does not set toolautosubmit when autoSubmit is omitted (0.1188ms)
✔ sets toolautosubmit (presence-only, empty string value) when autoSubmit is true (0.0924ms)
✔ sets toolparamdescription on the matching field by name (0.1588ms)
✔ throws when a field name has no matching form control (0.6296ms)
✔ throws when name is an empty string (0.1329ms)
✔ throws when description is an empty string (0.1439ms)
✔ never calls setAttribute on the form for name/description before validating both (0.115ms)
✔ returns a normalized tool with name, description and a JSON Schema inputSchema (4.8962ms)
✔ throws when name is an empty string (0.3621ms)
✔ throws when name is missing whitespace-only (0.1252ms)
✔ throws when description is an empty string (0.1675ms)
✔ throws when execute is not a function (0.133ms)
✔ the wrapped execute parses valid input and forwards it to the handler (1.424ms)
✔ the wrapped execute rejects when raw input fails schema validation (0.9357ms)
✔ the wrapped execute forwards the AbortSignal context unchanged (0.3212ms)
✔ passes annotations through to the returned tool when provided (0.26ms)
✔ omits annotations from the returned tool entirely when not provided (0.2391ms)
✔ passes title through to the returned tool when provided (0.1921ms)
✔ omits title from the returned tool entirely when not provided (0.1684ms)
✔ throws when name contains a character outside [A-Za-z0-9_.-] (0.1157ms)
✔ throws when name exceeds 128 characters (0.0892ms)
✔ warns (without throwing) when name exceeds the 30-character budget Chrome recommends (0.3231ms)
✔ warns (without throwing) when description exceeds the 500-character budget Chrome recommends (0.1759ms)
✔ does not warn for a name and description within budget (0.169ms)
✔ TOOL 1 (Imperativa): calculate_cart_total - calculo exitoso y validacion Zod (9.2042ms)
✔ TOOL 2 (Declarativa): flight_search_form - anotacion, atomicidad y agente submit (0.8084ms)
✔ CICLO DE VIDA: mock.reset() limpia estado y aisla pruebas (0.4969ms)
✔ returns false and warns (without throwing) when WebMCP is not supported (1.9782ms)
✔ calls document.modelContext.registerTool and returns true when supported (0.2461ms)
✔ forwards options (signal, exposedTo) unchanged as the second argument (0.1874ms)
✔ throws on an invalid spec even when WebMCP is unsupported (fails fast, never silently no-ops a bug) (0.3027ms)
✔ throws on an invalid spec when WebMCP IS supported, before ever calling the real registerTool (0.1238ms)
✔ returns false and never calls respondWith when agentInvoked is false (0.6567ms)
✔ returns true and calls respondWith exactly once when agentInvoked is true (0.1348ms)
✔ the promise passed to respondWith resolves to the handler return value (0.7696ms)
✔ the promise passed to respondWith resolves to the handler return value even when the handler is async (0.1672ms)
✔ a synchronous throw inside the handler rejects the promise instead of escaping (0.4556ms)
✔ the handler receives the event itself as its argument (0.1286ms)
✔ returns true when document.modelContext is an object (0.6039ms)
✔ returns false when document.modelContext is undefined (0.1105ms)
✔ returns false when document.modelContext is null (0.0845ms)
✔ returns false when document itself does not exist (0.0818ms)
✔ returns false when document.modelContext is not an object (e.g. a string) (0.097ms)
✔ never throws even with a weird document shape (0.1305ms)
✔ exposes a document shaped object with modelContext.registerTool (0.7762ms)
✔ invokeTool runs the real registered handler end to end via registerTool() (3.3895ms)
✔ invokeTool rejects with a clear error when no tool is registered under that name (0.5138ms)
✔ invokeTool provides a default AbortSignal when the caller does not pass one (0.5926ms)
✔ invokeTool forwards a caller-provided signal unchanged (0.3371ms)
✔ two tools registered on the same mock do not cross-contaminate (0.3289ms)
✔ emits a registerTool({...}) call with the tool name and description as JSON strings (0.6013ms)
✔ embeds the JSON Schema derived by defineTool(), not a re-declared one (0.4486ms)
✔ defaults to a TODO stub handler mentioning the sandbox constraints (0.0957ms)
✔ embeds a caller-provided handlerBody verbatim instead of the default stub (0.0882ms)
✔ output is syntactically valid JavaScript (compiles as a function body without throwing) (0.1496ms)
✔ escapes special characters in description safely (quotes, backslash, newline) (0.2954ms)
✔ handler is declared as a plain method (works for both sync and async handlerBody text) (0.0979ms)
ℹ tests 58
ℹ suites 0
ℹ pass 58
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 232.7356
```

### 3. `npm run typecheck`

```
> fastwebmcp@0.4.2 typecheck
> tsc --noEmit
```

(0 errores — exit code 0, sin salida de TypeScript.)

### 4. `python scripts/validate_contracts.py knowledge/contracts`

```
OK: todos los contratos son validos

Resumen: 0 error(es), 0 warning(s) en 32 archivo(s)
```