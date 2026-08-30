# Contrato 34 — Bootstrap del paquete TS + primera pieza del core

Prerrequisitos: `DEFINITION.md` cerrado. Plantilla KDD instanciada (`init_project.py --apply
--name fastwebmcp`), Nivel 1 en verde. RECON: Node v24.16.0 ejecuta `.ts` directo vía
`node --test` (type-stripping nativo, sin build step); `npm view zod version` resuelve
`4.5.4` (registro alcanzable). Este contrato cierra el bootstrap del paquete TypeScript y
la primera función atómica del core: la detección de soporte de WebMCP en runtime, que el
resto de las piezas (builder, registro, declarativo) van a consumir para el fallback
no-op + warning acordado en `DEFINITION.md`.

> Capa: este es un **contrato de ejecución** (nivel proyecto). T2 lleva además su **task
> contract** CCDD en `knowledge/contracts/supports-webmcp.md` (validado por
> `scripts/validate_contracts.py`).

## T1 — Bootstrap del paquete

Hoy no existe ningún archivo de configuración de Node/TypeScript en la raíz del repo.

FIX/OBJETIVO:
- `package.json` en la raíz: `name: "fastwebmcp"`, `"type": "module"`, `"private": true`
  (se abre al publicar, no en este contrato), dependencia `zod` (última `4.x`), devDependency
  `typescript` (última `5.x`).
- `tsconfig.json`: `strict: true`, `target: "ES2022"`, `module: "NodeNext"`,
  `moduleResolution: "NodeNext"`, `rootDir: "src_ts"`, `outDir: "dist"`.
- Carpetas `src_ts/` y `tests_ts/` creadas (el código y los tests del proyecto NO van en
  `tests/`, reservado a la suite Python del tooling KDD — ver README, sección "Instanciar
  para un proyecto no-Python").
- `.gitignore` de la raíz agrega `node_modules/` y `dist/` si no están ya.

## T2 (CCDD: `supports-webmcp`) — Detección de soporte WebMCP en runtime

No existe ninguna forma de saber, en runtime, si el navegador visitante soporta
`navigator.modelContext` antes de intentar registrar una tool.

FIX/OBJETIVO: una función pura `supportsWebMcp(): boolean` que devuelve `true` solo si
`navigator` existe y `navigator.modelContext` existe y es un objeto; `false` en cualquier
otro caso (SSR sin `navigator`, navegador sin la API, `navigator.modelContext` undefined/null).
Nunca lanza. Ver task contract: `knowledge/contracts/supports-webmcp.md`.

## Criterios de aceptación

- [ ] `python scripts/validate_contracts.py knowledge/contracts` exit 0.
- [ ] `python scripts/validate_specs.py specs` exit 0.
- [ ] `python scripts/validate_okf.py knowledge` exit 0.
- [ ] `python -m unittest discover -s tests -p "test_*.py"` verde (suite del tooling KDD,
  no tocada por este contrato).
- [ ] `node --test tests_ts/supports-webmcp.test.ts` exit 0.
- [ ] `npx tsc --noEmit` exit 0 (typecheck estricto del paquete completo).
- [ ] Final: `node --test tests_ts/supports-webmcp.test.ts` 2× verde (anti-flaky).

## Restricciones

- Tocar SOLO: `package.json`, `package-lock.json`, `tsconfig.json`, `.gitignore`,
  `src_ts/supports-webmcp.ts`, `tests_ts/supports-webmcp.test.ts`,
  `knowledge/contracts/supports-webmcp.md`, `knowledge/index.md` (agregar el enlace al
  nuevo contrato).
- Sin dependencias nuevas fuera de `zod` (runtime) y `typescript` (dev).
- `supports-webmcp.ts` no hace red, no usa `subprocess`/`child_process`, no depende de
  ningún LLM — coherente con `forbids: ['network', 'subprocess', 'llm']` del task contract.
- NO commitear (se commitea por tarea verificada, fuera de este contrato).
- ABORTAR SI: `npm view zod version` deja de resolver (registro no alcanzable) — la RECON
  ya lo verificó, pero si cambia entre RECON y ejecución, PARAR y reportar en vez de
  vendorizar una copia local. ABORTAR SI `node --test` no soporta `.ts` directo en el
  entorno real de ejecución (versión de Node distinta a la de RECON) — no agregar `ts-node`
  ni otro transpiler como parche silencioso; reportar la versión real y esperar decisión.

## Checklist antes de delegar

- [x] RECON corrido: versión de Node, ejecución de `.ts` vía `node --test`, resolución de
  `zod` en el registro — los tres verificados arriba, no supuestos.
- [x] Todo criterio de aceptación tiene comando + resultado esperado.
- [x] Red-team: `supportsWebMcp()` no puede "cumplir el comando sin cumplir la intención"
  porque el oráculo (T2) fija los cuatro casos (con API, sin API, sin `navigator`,
  `modelContext` no-objeto) antes de implementar, sellado por `tests_sha256`.
- [x] Perímetro declarado arriba (no hay tareas concurrentes en este contrato, T1 y T2 son
  secuenciales porque T2 depende de que exista `tsconfig.json`).
- [x] Condiciones de aborto explícitas arriba.
