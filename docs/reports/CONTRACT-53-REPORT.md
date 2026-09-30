# CONTRACT-53 — Correcciones de auditoria FastWebMCP

## Resultado

Se corrigieron los siete hallazgos del commit cde4e669 conservando las firmas
sincronas existentes. `registerToolAsync` y `registerLsfaToolAsync` proporcionan
confirmacion del navegador y propagan el error original. El boolean sincrono
documenta dispatch; los rechazos posteriores emiten warning.

AutoSubmit=false retira el atributo, scopes de pruebas esperan la promesa,
listeners obsoletos se retiran al resetear/reemplazar, LSFA parsea una sola vez,
la deteccion de nombres sensibles usa tokens y el scan local/MCP apunta a src_ts.

## Evidencia KDD

Nuevas pruebas escritas antes de modificar fuentes y ejecutadas en rojo. Se
corrigio un error del nuevo helper de pruebas: withDocument devuelve void; ahora
el helper captura y espera el retorno del callback. Se actualizo explicitamente
el sello y se volvio a verificar la version final del oraculo contra las fuentes
del commit original en una copia aislada. Ningun oraculo preexistente se modifico.

Task contracts:
- `knowledge/contracts/audit-runtime-fixes.md`.
- `knowledge/contracts/audit-scan-target.md`.

## Validacion

- `npm run typecheck`: PASS.
- `npm test`: 83/83 PASS, dos corridas.
- `npm run build` y `npm run build:examples`: PASS.
- Suite Python: 656 tests, OK (16 omitidos), dos corridas.
- `python scripts/preflight.py --agent`: 19/19 PASS.
- Contratos: 36 archivos, sin errores ni warnings; specs: 53 archivos, sin errores.
- `npm pack --dry-run --json`: PASS; imports desde fastwebmcp y fastwebmcp/lsfa
  confirman ambas APIs Async en el paquete compilado.
- `git diff --check`: PASS; ningun test preexistente aparece modificado.
- Oraculo TypeScript final contra fuentes originales: 0/12 PASS (rojo).
- Oraculos nuevos contra fuentes corregidas: 12/12 TypeScript y 2/2 Python.
- Reportes locales sellados para ambos task contracts; validate_attestation: PASS.

La evidencia se guarda en `.agents/logs/audit-fixed-*` y en los reportes
`audit-runtime-fixes-REPORT.md` y `audit-scan-target-REPORT.md`.

No se agregaron dependencias ni se cambiaron package.json o package-lock.json.

## Limites

La API sincrona no puede comunicar el resultado futuro de una promesa: usar las
nuevas variantes Async para confirmar registro. El mock conserva su semantica
de reemplazo por nombre; no implementa toda la API nativa. Scopes globales
asincronos deben usarse en serie o anidados con await.

No se publico el paquete ni se ejecuto CI remoto. La heuristica de nombres
sensibles no reemplaza la politica del broker LSFA.

## Prueba posterior en navegador real

El 30 de septiembre de 2026, la pagina local abierta por el usuario guardo
`.agents/logs/browser-probe/results.json`: 10 PASS, 0 FAIL, 0 SKIP. El navegador
reporto Chromium 154, contexto seguro y document.modelContext nativo disponible.
La prueba importa las fuentes locales corregidas, bundleadas con esbuild.

- Registro Async confirmado y descubrimiento por getTools.
- Ejecucion nativa: 19+23 produce 42 y el handler se ejecuta una vez.
- Registro duplicado Async: InvalidStateError, Duplicate tool name.
- Registro duplicado sincrono: un warning y ningun unhandledRejection.
- AbortSignal elimina el registro nativo.
- LSFA registra y ejecuta con broker simulado: count=1 llega como 2, una sola normalizacion.
- Input invalido rechazado sin ejecutar el handler.
- autoSubmit=false elimina el atributo sobre un formulario DOM real.
- shipping_address aceptado y accessToken rechazado.
- Worker real sin document: registro false y un warning, fallback correcto.

Chromium 154 acepto la invocacion con RegisteredTool y argumentos JSON string;
la prueba detecto esa forma (record-json). El broker LSFA es simulado y no se
ejecutaron operaciones externas. Los resultados iniciales provienen del script
de la pagina y fueron leidos desde su archivo local.

Posteriormente se verifico la conexion directa del agente con Codex In-app
Browser mediante browser-client.mjs y la capacidad WebMCP de la pestaña abierta.
Se descubrieron las herramientas publicadas y se invocaron desde el agente:

- probe_sum con a=37 y b=5 devolvio {"sum":42}.
- probe_lsfa con count=7 devolvio {"status":"accepted","operation":"count"}
  mediante el broker simulado.
- probe_sum con a="invalid" fue rechazado por la invocacion nativa.

La evidencia directa esta en `.agents/logs/browser-probe/direct-webmcp.json`
y la captura de la pagina en `.agents/logs/browser-probe/direct-browser.png`.
La conexion y el control del navegador integrado funcionan; la conclusion
anterior de que no estaban disponibles fue incorrecta.
