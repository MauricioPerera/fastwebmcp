# Contrato 52 — integracion opcional FastWebMCP + LSFA

Prerrequisitos: CONTRACT-51 cerrado y baseline 19/19. Este contrato agrega una frontera
transport-agnostic hacia LSFA 0.2 + Presentation 0.3 sin implementar LSFA ni modificar
Email Agent.

> Capa: contrato de ejecucion. El codigo nuevo tiene task contracts CCDD sellados en
> `knowledge/contracts/lsfa-tool.md` y `knowledge/contracts/lsfa-testing.md`.

## LSFA-CORE (T1) — modulo publico y frontera de autoridad

OBJETIVO: publicar `fastwebmcp/lsfa` con tipos estrictos, broker inyectable,
`defineLsfaTool` y `registerLsfaTool`, separando argumentos del agente de captura segura.

## LSFA-MOCK (T2) — simulacion determinista

OBJETIVO: publicar `fastwebmcp/lsfa/testing` para pruebas y una demo marcada como
simulacion, sin aprobacion ni ejecucion reales.

## LSFA-DOCS (T3) — documentacion y pagina publica

OBJETIVO: documentar arquitectura, uso, limites y futuro de transportes; agregar una demo
autocontenida a GitHub Pages sin presentar el mock como garantia de seguridad.

## Criterios de aceptación

- [ ] `python scripts/validate_contracts.py knowledge/contracts` exit 0 con ambos oraculos sellados.
- [ ] `node --test tests_ts/lsfa.test.ts tests_ts/lsfa-testing.test.ts` verde.
- [ ] `npm run typecheck`, `npm test`, `npm run build` y `npm run build:examples` exit 0.
- [ ] `npm pack --dry-run` incluye `dist/lsfa.js`, tipos y subpath de testing.
- [ ] Los 19 checks de `python scripts/preflight.py --agent` pasan.
- [ ] `python scripts/scan_secrets.py src_ts examples` exit 0.
- [ ] Prueba de navegador confirma registro/ejecucion con WebMCP simulado y fallback sin WebMCP.
- [ ] La matriz CI Ubuntu/Windows queda verde para el commit publicado.

## Restricciones

- Tocar SOLO: `src_ts/lsfa.ts`, `src_ts/lsfa-testing.ts`, exports/metadata del paquete,
  tests nuevos, `examples/`, README, DEFINITION, CHANGELOG, GitHub Pages, nodos/contratos
  KDD y reporte de este contrato.
- No modificar pruebas existentes ni reescribir los nuevos oraculos despues de sellarlos.
- Sin nuevas dependencias, secretos, HTTP loopback, Native Messaging ni extension real.
- ABORTAR SI: la integracion requiere secretos en WebMCP, ejecucion sin broker o cambios
  incompatibles a la API existente.

## Checklist antes de delegar

- [x] RECON: baseline 19/19; API, exports, CI y contratos existentes inspeccionados.
- [x] Criterios observables con comandos y resultados esperados.
- [x] Red-team: oraculos cubren schemas secretos anidados, resultados extra, error filtrado,
  abort previo, seis estados, fallback y `exposedTo`.
- [x] Perimetro declarado; no hay tareas concurrentes.
- [x] Condiciones de aborto explicitas; no activadas.

