# Contrato 54 — editor de texto WebMCP

## Objetivo

Integrar el editor local ya probado como ejemplo reproducible, usando las
fuentes de fastwebmcp y sin dependencias nuevas.

## Criterios de aceptación

- [x] `node --test tests_ts/text-editor.test.ts` exit 0, dos corridas.
- [x] `npm run typecheck` exit 0 e incluye ejemplos anidados.
- [x] `npm test` exit 0, dos corridas.
- [x] `npm run build` y `npm run build:examples` exit 0.
- [x] `python scripts/preflight.py --agent` exit 0, 19/19 checks.
- [x] Ocho herramientas descubiertas e invocadas en el navegador integrado.
- [x] Conflicto de revision rechazado sin alterar el contenido.

## Restricciones

- Tocar SOLO: examples/text-editor, tests_ts/text-editor.test.ts, package.json,
  tsconfig.json, README, CHANGELOG, nuevo contrato, indice, spec y reporte.
- Sin nuevas dependencias ni modificacion de tests preexistentes.
- ABORTAR SI: integrar el ejemplo requiere transmitir datos a terceros.

## Checklist antes de delegar

- [x] RECON: editor standalone probado, 8 herramientas disponibles.
- [x] Oraculo nuevo escrito antes de copiar las fuentes al repositorio.
- [x] Perimetro y condiciones de aborto declarados.
