# CONTRACT-34 — Bootstrap del paquete TS + primera pieza del core — REPORT

Fecha: 2026-08-30
Spec: `specs/CONTRACT-34-bootstrap-core.md`

## Resumen ejecutivo

| Criterio | Veredicto | Evidencia |
|---|---|---|
| `python scripts/validate_contracts.py knowledge/contracts` | ✅ | `OK: todos los contratos son validos` (0 errores, 0 warnings, 26 archivos) |
| `python scripts/validate_specs.py specs` | ✅ | `OK: todos los contratos de specs son validos` (0 errores, 34 archivos) |
| `python scripts/validate_okf.py knowledge` | ✅ | `OK: todos los nodos OKF son conformes` (0 errores, 0 warnings, 50 archivos) |
| Suite `unittest` (tooling KDD, no tocada) | ✅ exit 0 | `python -m unittest discover -s tests -p "test_*.py"` |
| `node --test tests_ts/supports-webmcp.test.ts` | ✅ verde 2× (6 tests c/u) | dos corridas consecutivas, `fail 0` ambas |
| `npx tsc --noEmit` | ✅ | exit 0, sin salida |

## T1 — Bootstrap del paquete

`package.json` (ESM, `zod@^4.5.4` como dependencia, `typescript@^5.7.3` +
`@types/node@^24.0.0` como devDependencies), `tsconfig.json`, carpetas
`src_ts/`/`tests_ts/`. `node_modules/`/`dist/` ya estaban en `.gitignore` (no se tocó).

Desvíos respecto al spec original (documentados, no ocultos):
- El spec proponía `rootDir: "src_ts"` + `declaration: true` + `outDir: "dist"`. `tsc`
  rechaza `rootDir: "src_ts"` en cuanto `tests_ts/` (fuera de ese root) entra por
  `include` (`TS6059`). Como este contrato no necesita un build real todavía (no hay
  paso de publicación en el alcance de T2), se simplificó a `noEmit: true` sin
  `rootDir`/`declaration`/`outDir` — el build para distribución queda para el contrato
  que agregue publicación a npm.
- Se agregó `allowImportingTsExtensions: true` y `types: ["node"]` (no estaban en el
  spec): necesarios porque Node ejecuta `.ts` con type-stripping nativo y exige la
  extensión explícita en los imports (`import ... from '../src_ts/x.ts'`), y los tipos
  de `node:test`/`node:assert` requieren `@types/node`.

## T2 (CCDD: `supports-webmcp`) — Detección de soporte WebMCP en runtime

`src_ts/supports-webmcp.ts`: `supportsWebMcp(): boolean`, sin red/subprocess/LLM, según
`knowledge/contracts/supports-webmcp.md`.

Desvío del oráculo respecto al primer intento (documentado): la primera versión de
`tests_ts/supports-webmcp.test.ts` asignaba `globalThis.navigator = ...` directamente,
lo cual falla en Node ≥21 (`navigator` global es un accessor solo-lectura:
`TypeError: Cannot set property navigator ... which has only a getter`). Se corrigió
usando `Object.defineProperty(globalThis, 'navigator', { value, configurable: true,
writable: true })` con restauración del descriptor original en un `finally`. El fix se
hizo ANTES de sellar el hash (el `tests_sha256` en el contrato corresponde a la versión
corregida) — no hubo re-sellado post-implementación.

## Verificación final (independiente, re-ejecutada tras el fix)

- `node --test tests_ts/supports-webmcp.test.ts`: 2/2 corridas verdes, `fail 0` ambas.
- `npx tsc --noEmit`: exit 0.
- Los cuatro gates de Nivel 1 relevantes (`validate_contracts`, `validate_specs`,
  `validate_okf`, suite `unittest`) re-corridos después de todos los cambios: los cuatro
  en verde.

## Numeración de contratos — nota

Este proyecto (`fastwebmcp`) se instanció desde la plantilla KDD, que ya trae
`specs/CONTRACT-01..33` y sus reportes: es el historial de dogfooding de la propia
plantilla (28+ contratos consecutivos mencionados en el README), no de este proyecto.
`init_project.py --apply` no los borra (no están en su `MANIFEST` de artefactos de
ejemplo) porque son evidencia de la metodología, no contenido de ejemplo descartable.
Para evitar dos archivos distintos ambos llamados "CONTRACT-01" con contenido no
relacionado, los contratos de este proyecto continúan la numeración desde 34 en vez de
reiniciar en 01. Si se prefiere separar visualmente el historial de la plantilla del de
este proyecto (ej. moverlo a `specs/_template-history/`), es una decisión de housekeeping
pendiente, no tomada acá por no estar pedida.

## Pendientes / ítems de seguimiento

- `defineTool()` (builder tipado con Zod, API Imperativa) — próximo contrato, firma aún
  sin cerrar por diseño (ver `DEFINITION.md`).
- Sin build/bundle para publicación a npm todavía (fuera de alcance de este contrato).
- Housekeeping opcional: separar visualmente el historial `CONTRACT-01..33` de la
  plantilla del de `fastwebmcp` (ver nota arriba) — no se hizo, no fue pedido.
