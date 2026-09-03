# TESTING-HELPERS-REPORT — Helpers ergonómicos en `WebMcpMock`

Fecha: 2026-09-03
Archivo modificado: **solo** `src_ts/testing.ts`
Cambio: se agregaron `hasTool(name)`, `getTool(name)` y `reset()` a la interfaz `WebMcpMock` y a `createWebMcpMock()`, sin tocar tests ni contratos.

---

## 1. `node --test tests_ts/testing.test.ts`

```
✔ exposes a document shaped object with modelContext.registerTool (0.793ms)
✔ invokeTool runs the real registered handler end to end via registerTool() (2.6307ms)
✔ invokeTool rejects with a clear error when no tool is registered under that name (0.3406ms)
✔ invokeTool provides a default AbortSignal when the caller does not pass one (0.3604ms)
✔ invokeTool forwards a caller-provided signal unchanged (0.244ms)
✔ two tools registered on the same mock do not cross-contaminate (0.2732ms)
ℹ tests 6
ℹ suites 0
ℹ pass 6
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 172.4048
```

## 2. `npm test`

```
> fastwebmcp@0.4.2 test
> node --test tests_ts/**/*.test.ts

(… 55 tests en verde …)

ℹ tests 55
ℹ suites 0
ℹ pass 55
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 210.7473
```

Lista completa de los 55 tests (salida íntegra de la ejecución):

```
✔ sets toolname and tooldescription on the form (0.7391ms)
✔ does not set toolautosubmit when autoSubmit is omitted (0.117ms)
✔ sets toolautosubmit (presence-only, empty string value) when autoSubmit is true (0.096ms)
✔ sets toolparamdescription on the matching field by name (0.1478ms)
✔ throws when a field name has no matching form control (0.3377ms)
✔ throws when name is an empty string (0.1004ms)
✔ throws when description is an empty string (0.0912ms)
✔ never calls setAttribute on the form for name/description before validating both (0.0863ms)
✔ returns a normalized tool with name, description and a JSON Schema inputSchema (3.7492ms)
✔ throws when name is an empty string (0.3362ms)
✔ throws when name is missing whitespace-only (0.123ms)
✔ throws when description is an empty string (0.1543ms)
✔ throws when execute is not a function (0.1305ms)
✔ the wrapped execute parses valid input and forwards it to the handler (1.2371ms)
✔ the wrapped execute rejects when raw input fails schema validation (0.8136ms)
✔ the wrapped execute forwards the AbortSignal context unchanged (0.2707ms)
✔ passes annotations through to the returned tool when provided (0.2171ms)
✔ omits annotations from the returned tool entirely when not provided (0.2526ms)
✔ passes title through to the returned tool when provided (0.3621ms)
✔ omits title from the returned tool entirely when not provided (0.2286ms)
✔ throws when name contains a character outside [A-Za-z0-9_.-] (0.2282ms)
✔ throws when name exceeds 128 characters (0.1025ms)
✔ warns (without throwing) when name exceeds the 30-character budget Chrome recommends (0.2938ms)
✔ warns (without throwing) when description exceeds the 500-character budget Chrome recommends (0.339ms)
✔ does not warn for a name and description within budget (0.1974ms)
✔ returns false and warns (without throwing) when WebMCP is not supported (1.8548ms)
✔ calls document.modelContext.registerTool and returns true when supported (0.2619ms)
✔ forwards options (signal, exposedTo) unchanged as the second argument (0.1671ms)
✔ throws on an invalid spec even when WebMCP is unsupported (fails fast, never silently no-ops a bug) (0.2839ms)
✔ throws on an invalid spec when WebMCP IS supported, before ever calling the real registerTool (0.1291ms)
✔ returns false and never calls respondWith when agentInvoked is false (0.7485ms)
✔ returns true and calls respondWith exactly once when agentInvoked is true (0.1362ms)
✔ the promise passed to respondWith resolves to the handler return value (0.6625ms)
✔ the promise passed to respondWith resolves to the handler return value even when the handler is async (0.1451ms)
✔ a synchronous throw inside the handler rejects the promise instead of escaping (0.3643ms)
✔ the handler receives the event itself as its argument (0.1055ms)
✔ returns true when document.modelContext is an object (0.6405ms)
✔ returns false when document.modelContext is undefined (0.1012ms)
✔ returns false when document.modelContext is null (0.0896ms)
✔ returns false when document itself does not exist (0.0785ms)
✔ returns false when document.modelContext is not an object (e.g. a string) (0.1056ms)
✔ never throws even with a weird document shape (0.1452ms)
✔ exposes a document shaped object with modelContext.registerTool (0.4698ms)
✔ invokeTool runs the real registered handler end to end via registerTool() (2.882ms)
✔ invokeTool rejects with a clear error when no tool is registered under that name (0.3064ms)
✔ invokeTool provides a default AbortSignal when the caller does not pass one (0.3106ms)
✔ invokeTool forwards a caller-provided signal unchanged (0.2413ms)
✔ two tools registered on the same mock do not cross-contaminate (0.3185ms)
✔ emits a registerTool({...}) call with the tool name and description as JSON strings (0.715ms)
✔ embeds the JSON Schema derived by defineTool(), not a re-declared one (0.4872ms)
✔ defaults to a TODO stub handler mentioning the sandbox constraints (0.0945ms)
✔ embeds a caller-provided handlerBody verbatim instead of the default stub (0.0844ms)
✔ output is syntactically valid JavaScript (compiles as a function body without throwing) (0.1551ms)
✔ escapes special characters in description safely (quotes, backslash, newline) (0.3101ms)
✔ handler is declared as a plain method (works for both sync and async handlerBody text) (0.0972ms)
ℹ tests 55
ℹ suites 0
ℹ pass 55
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 210.7473
```

## 3. `npm run typecheck`

```
> fastwebmcp@0.4.2 typecheck
> tsc --noEmit

(0 errores de TypeScript — salida sin diagnostics)
```

## 4. `python scripts/validate_contracts.py knowledge/contracts`

```
OK: todos los contratos son validos

Resumen: 0 error(es), 0 warning(s) en 32 archivo(s)
```

---

## Definición de hecho

| Criterio | Estado |
|---|---|
| `node --test tests_ts/testing.test.ts` en verde | ✅ 6/6 pass |
| `npm test` en verde (55 tests) | ✅ 55/55 pass |
| `npm run typecheck` en verde (0 errores TS) | ✅ 0 errores |
| `python scripts/validate_contracts.py knowledge/contracts` en verde | ✅ 0 errores, 0 warnings |