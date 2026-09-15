# CONTRACT-52 — Reporte de integración FastWebMCP + LSFA

## Resultado

Se implementó la frontera opcional y transport-agnostic definida en
`specs/CONTRACT-52-lsfa-integration.md`. FastWebMCP no implementa LSFA: valida la
intención no sensible, despacha al broker inyectado y valida un resumen sanitizado.

## Evidencia KDD

- Baseline previo: `python scripts/preflight.py --agent` → 19/19.
- Oráculos escritos antes de los targets y observados en rojo por módulos inexistentes.
- Hash `tests_ts/lsfa.test.ts`: `b37b0f7084022803f3f69ba63da5e2d04be513593c669cbd8f8431cd29da1408`.
- Hash `tests_ts/lsfa-testing.test.ts`: `1c8bfa6ed98b5b0c124351a71050d8da37459cfffa451b97daaf384fcfbec215`.
- `python scripts/audit_seals.py knowledge/contracts --strict` → 34 contratos, 0 hallazgos.
- Los oráculos no se modificaron después de sellarlos.

## Evidencia funcional

- Pruebas LSFA: 9/9 verdes.
- Suite TypeScript completa: 71/71 verde.
- `npm run typecheck` y `npm run build` → exit 0.
- `npm run build:examples` → cuatro bundles, incluido worker de fallback.
- `npm pack --dry-run --json` contiene `dist/lsfa.js`, `dist/lsfa.d.ts`,
  `dist/lsfa-testing.js` y `dist/lsfa-testing.d.ts`.
- `npm ci` → 0 vulnerabilidades.
- `python scripts/validate_ux_page.py examples/ux-page` → 3 HTML, 0 errores, 0 warnings.
- `python scripts/scan_secrets.py src_ts examples` → exit 0.

## Navegador real

La demo se sirvió por HTTP local y se abrió en Chromium con WebMCP real. El navegador
descubrió `send_email_securely` con un schema que contiene solo `recipient` y `subject`.
La primera llamada real reveló que ese runtime omitía `context`; se corrigió sin tocar el
oráculo y la repetición devolvió `accepted`, checks booleanos y una referencia almacenada
sin secreto. La variante `?without-webmcp=1` ejecutó `registerLsfaTool` dentro de un Web
Worker real (realm sin `document`) y mostró: “safe no-op verified (one warning, no
registration)”; el navegador confirmó que ya no había tools disponibles.

## Límites conservados

- El mock está marcado como simulación y nunca crea una aprobación por defecto.
- No hay HTTP loopback, Native Messaging, extensión, red, credenciales ni ejecución real.
- `exposedTo` y el signal de desregistro siguen pasando por `registerTool`.
- Abort previo impide dispatch; después del dispatch no hay retry automático.

## Auditoría contra la fuente LSFA

Antes del cierre se clonó de nuevo `MauricioPerera/local-secure-forms` y se compararon
directamente `schemas/result.schema.json`, `schemas/presentation.schema.json` y
`schemas/request.schema.json`. La primera versión local tenía drift: `critical` en vez de
`irreversible`, checks fijos, referencias solo booleanas y campos opcionales tratados como
obligatorios. Se corrigió sin modificar los oráculos: riesgo canónico, checks booleanos
registrados, referencias `true/false/present/absent`, resultado mínimo status+operation,
y límites/modos/tema `high_contrast` de Presentation 0.3.
