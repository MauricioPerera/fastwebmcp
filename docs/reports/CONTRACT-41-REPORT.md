# CONTRACT-41 — Dejar el paquete listo para publicar a npm — REPORT

Fecha: 2026-08-30
Spec: `specs/CONTRACT-41-npm-publish-readiness.md`

## Resumen ejecutivo

| Criterio | Veredicto | Evidencia |
|---|---|---|
| `python scripts/validate_contracts.py knowledge/contracts` | ✅ | `OK` (0 errores, 31 archivos) |
| `python scripts/validate_specs.py specs` | ✅ | `OK` (0 errores, 41 archivos) |
| `python scripts/validate_okf.py knowledge` | ✅ | `OK` (0 errores, 55 archivos) |
| `python scripts/validate_changelog.py` | ✅ | ver abajo |
| `npm run typecheck` | ✅ | exit 0 |
| `npm test` | ✅ | 39/39 |
| `npm run build` | ✅ | `dist/*.js`+`.d.ts`, imports reescritos a `.js`, sin zod bundleado |
| `npm pack --dry-run` | ✅ | nombre disponible, tarball sin `src_ts`/`tests_ts`/`examples` |
| Instalación real del tarball en proyecto scratch | ✅ | ver detalle abajo |

## RECON

- `npx tsc --version` -> `5.9.3` (rango declarado `^5.7.3`), soporta
  `--rewriteRelativeImportExtensions` (agregado en TS 5.7, confirmado con `tsc --help --all`).
- `npm view fastwebmcp` -> `404 Not Found` — nombre libre en el registro.
- `npm audit` final -> `0 vulnerabilidades`.

## T1 — Build real (`tsconfig.build.json`)

Extiende `tsconfig.json`: `noEmit: false`, `declaration: true`, `declarationMap: true`,
`sourceMap: true`, `rewriteRelativeImportExtensions: true`, `outDir: dist`,
`rootDir: src_ts`, `include: ["src_ts/**/*.ts"]` (excluye tests/examples). Verificado
manualmente el output: `dist/index.js` importa `"./supports-webmcp.js"` (reescrito
correctamente desde el `.ts` fuente), `dist/register-tool.js` no tiene ningun `import`
de `zod` (el `import type` se borra en compilación — la librería nunca usa zod a
runtime, solo llama metodos de instancia sobre el schema que el consumidor provee).

Este build es DISTINTO del bundle de `examples/dist/` (CONTRACT-40): ese bundlea zod
completo para consumo standalone en un navegador via `<script type="module">`; este
(`dist/`, lo que se publica a npm) NO bundlea nada — deja cada modulo separado con
`zod` como dependencia externa real, para que el bundler/Node del CONSUMIDOR la
resuelva normalmente.

## T2 — package.json

`"private": true` removido. Agregado: `main`/`types` -> `./dist/index.js`/`./dist/index.d.ts`,
`exports["."]` con `types`+`default`, `files: ["dist"]`, `repository`/`homepage`/`bugs`
apuntando a `github.com/MauricioPerera/fastwebmcp`, `keywords`, `license: "MIT"`
(ya existía en `LICENSE`, sin cambios), `engines.node: ">=18"`. Scripts nuevos: `build`
(`tsc -p tsconfig.build.json`), `prepublishOnly` (`typecheck && test && build` — npm lo
corre automaticamente en un `npm publish` real como ultima red de seguridad).
`version` fijada a `0.1.0` (no `0.0.1`: ya pasaron 7 contratos verificados con capacidad
completa, no es un placeholder inicial).

## T3 — README real

**Hallazgo no anticipado en el spec original de CONTRACT-34:** el `README.md` de la raíz
seguía siendo el genérico de la plantilla KDD (44.5kB, trilingüe EN/ES/PT, sobre
OKF/CCDD) — `init_project.py --apply` solo había reemplazado el H1 (documentado en su
propio comportamiento, no un bug). npm publica SIEMPRE el `README.md` de la raíz sin
importar el `files` whitelist; sin corregirlo, la página de npm del paquete hubiera
mostrado documentación de metodología en vez de cómo usar la librería. Reescrito a:
instalación, ejemplo de ambas APIs (Imperativa/Declarativa), harness de testing,
superficie de API, y una sección corta que remite a `AGENTS.md`/`knowledge/index.md`
para quien quiera contribuir siguiendo KDD. De paso se corrigió un import de subpath
inventado (`fastwebmcp/testing`, que no existe en el `exports` real) antes de publicarlo
como si funcionara.

## Verificación final — instalación real del tarball (la más fuerte de este contrato)

`npm pack` (real, sin tocar el registro) produjo `fastwebmcp-0.1.0.tgz` (7.1kB
comprimido, 21.4kB sin comprimir, 31 archivos). Instalado con
`npm install ./fastwebmcp-0.1.0.tgz` en un proyecto Node aislado bajo el scratchpad de
la sesión (fuera del repo). Script de verificación (`verify.mjs`) importó los 6 exports
públicos desde `'fastwebmcp'` (no desde `../src_ts/`) y corrió un roundtrip real:
`registerTool` sobre un `document` mockeado con `createWebMcpMock()`, luego
`mock.invokeTool('add_todo', { text: '...' })` — devolvió `"Added: Verify the published
package"` exactamente como en la suite de desarrollo, mismo comportamiento en el paquete
YA empaquetado. Todos los `typeof export === 'function'`. Tarball y directorio scratch
limpiados tras la verificación.

## Pendientes / ítems de seguimiento

- `npm publish` en sí: acción del usuario, con sus credenciales — comandos entregados en
  el chat, no ejecutados desde esta sesión.
- Tras el primer publish real, considerar agregar un badge de CI/tests al README (no
  existe pipeline de CI de JS propio todavía, solo el gate Python de la plantilla).
- Sin `CHANGELOG` de la librería en formato Keep-a-Changelog separado del `CHANGELOG.md`
  de contratos KDD — decisión diferida, no pedida.
