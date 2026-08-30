# Contrato 36 — Builder tipado (Zod) para tools WebMCP Imperativas

Prerrequisitos: CONTRACT-35 cerrado (`supportsWebMcp` corregido contra `document.modelContext`,
verificado con fuente primaria). RECON: `zod@4.5.4` expone `z.toJSONSchema()` y el metodo de
instancia `schema.toJSONSchema()` de forma nativa (sin `zod-to-json-schema`); confirmado con
una corrida real antes de escribir el contrato. Forma real de `document.modelContext.registerTool()`
verificada contra `developer.chrome.com/docs/ai/webmcp/imperative-api`: `inputSchema` es JSON
Schema (`type`/`properties`/`required`), `execute` recibe `(inputs, { signal })`.

> Capa: contrato de ejecución. T1 lleva su task contract CCDD en
> `knowledge/contracts/define-tool.md`.

## T1 (CCDD: `define-tool`) — Builder tipado

Hoy declarar una tool WebMCP exige escribir el JSON Schema a mano y no valida el input en
runtime antes de invocar `execute` — igual que MCP crudo antes de FastMCP.

FIX/OBJETIVO: `defineTool(spec)` toma `{ name, description, inputSchema: ZodType, execute }`
y devuelve `{ name, description, inputSchema: <JSON Schema>, execute: <fn que parsea antes
de invocar> }`, listo para pasarle a `document.modelContext.registerTool()` (el wrapper que
realmente registra es tarea futura, fuera de este contrato — ver
`knowledge/contracts/define-tool.md`). Lanza en tiempo de definición (no de ejecución) si
`name`/`description` estan vacios o `execute` no es una función.

## Criterios de aceptación

- [ ] `python scripts/validate_contracts.py knowledge/contracts` exit 0.
- [ ] `python scripts/validate_specs.py specs` exit 0.
- [ ] `python scripts/validate_okf.py knowledge` exit 0.
- [ ] `python scripts/validate_changelog.py` exit 0.
- [ ] `node --test tests_ts/define-tool.test.ts` 2× verde (8 tests).
- [ ] `npx tsc --noEmit` exit 0.
- [ ] `python scripts/validate_test_commands.py knowledge/contracts .` — `define-tool.md`
  en `PASS`.

## Restricciones

- Tocar SOLO: `src_ts/define-tool.ts`, `tests_ts/define-tool.test.ts`,
  `knowledge/contracts/define-tool.md`, `knowledge/index.md`, `CHANGELOG.md`,
  `docs/reports/CONTRACT-36-REPORT.md`.
- Sin dependencias nuevas fuera de `zod` (ya en `dependencies` desde CONTRACT-34).
- `define-tool.ts` no hace red, no usa `subprocess`/`child_process`, no depende de ningún
  LLM (coherente con `forbids` del task contract) — el handler que el CALLER pasa es
  opaco y queda fuera del alcance de esta restricción.
- NO commitear (se commitea por tarea verificada, fuera de este contrato).
- ABORTAR SI: `z.toJSONSchema`/`schema.toJSONSchema()` no existiera en la versión
  instalada de `zod` (ya verificado que existe — no se activa). ABORTAR SI el JSON Schema
  derivado no incluyera `type`/`properties`/`required` de forma reconocible por
  `document.modelContext.registerTool` — no verificable sin un navegador real con el
  origin trial activo; se documenta como límite conocido (no bloqueante para este
  contrato, que es puro y no registra nada).

## Checklist antes de delegar

- [x] RECON corrido: `zod` con conversión nativa a JSON Schema, forma real de
  `registerTool` — ambos verificados con comandos/fetches reales antes de escribir tests.
- [x] Todo criterio de aceptación tiene comando + resultado esperado.
- [x] Red-team: el oráculo cubre normalización exitosa, las 3 formas de spec inválido
  (name vacío, description vacío, execute no-función) y el comportamiento del `execute`
  envuelto (parseo exitoso, rechazo por input inválido, reenvío del `signal`) — no hay
  forma de pasar el test_command sin que `defineTool` realmente valide y normalice.
- [x] Perímetro declarado arriba, sin tareas concurrentes.
- [x] Condiciones de aborto explícitas arriba (ninguna se activó).
