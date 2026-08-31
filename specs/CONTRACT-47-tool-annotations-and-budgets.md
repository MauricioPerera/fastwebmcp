# Contrato 47 — Annotations, formato de name y avisos de presupuesto en defineTool()

Prerrequisitos: CONTRACT-36 cerrado (`defineTool()` normaliza y valida), CONTRACT-42
cerrado (`toMcpwasmSkillSource()`). RECON: verificado contra el spec real
(`webmachinelearning.github.io/webmcp`) que `ModelContextTool` define `annotations` con
exactamente dos campos, `readOnlyHint` y `untrustedContentHint` (ambos boolean, default
`false`) -- NO existe `outputSchema`/`resultSchema` en ningun lado del spec ni de la
implementacion real de Chrome (confirmado tambien contra el JSON crudo de otro sitio real
del directorio `webmcp.com`, `render.com`, via su API publica). El nombre de una tool debe
tener 1-128 caracteres, solo `[A-Za-z0-9_.-]` (spec). La guia de seguridad de Chrome
(`developer.chrome.com/docs/ai/webmcp/secure-tools`) recomienda limites de caracteres para
resultados confiables del agente: nombre <=30, descripcion <=500, descripcion de parametro
<=150, nombre de parametro <=30, output <=1.5K -- son recomendaciones, no reglas del spec.

Origen: surgio de escanear el propio sitio de `fastwebmcp` en `webmcp.com` (grade B+),
que senalo "No result schemas anywhere" como debilidad. Investigado y descartado
explicitamente (ver conversacion) porque ningun sitio del ecosistema puede satisfacerlo --
no es un gap de fastwebmcp, es un limite del spec completo. La investigacion de seguimiento
encontro dos gaps reales que si son accionables: `annotations` (soportado por spec y
Chrome, ausente en fastwebmcp) y falta de validacion de formato/presupuesto de caracteres.

> Capa: contrato de ejecucion. T1 amplia el task contract CCDD existente en
> `knowledge/contracts/define-tool.md` (NO crea uno nuevo -- modifica `defineTool()`,
> re-sella su oraculo). T2 es un ajuste de compatibilidad forzado por T1 sobre el oraculo
> de `knowledge/contracts/to-mcpwasm-skill.md`.

## T1 (CCDD: `define-tool`, AMPLIADO) — annotations + validacion de name + avisos

FIX/OBJETIVO: `defineTool(spec)` ahora:
1. Acepta `spec.annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean }`
   y lo copia tal cual al `DefinedTool` devuelto (ausente si no se paso -- nunca manda
   `undefined` ni `{}` al navegador).
2. Lanza si `spec.name` no cumple `/^[A-Za-z0-9_.-]{1,128}$/` (ademas del chequeo de
   no-vacio que ya existia) -- falla temprano y claro, en vez de que el navegador real
   rechace un nombre invalido con un error menos util.
3. Emite `console.warn` (NUNCA lanza) si `name` supera 30 caracteres o `description`
   supera 500 -- los limites recomendados por Chrome, citados en el mensaje.

## T2 (CCDD: `to-mcpwasm-skill`, oraculo re-sellado, SIN cambio de codigo) — fix de
compatibilidad

Un test existente (`escapes special characters in name/description safely`) usaba un
`name` con comillas (`weird_"tool"`) para probar el escapado seguro de
`toMcpwasmSkillSource()` -- invalido bajo la nueva regla de T1. Corregido: el nombre pasa
a ser valido (`weird_tool`) y la cobertura de escapado de caracteres especiales
(comillas, backslash, newline) se mueve enteramente a `description` (que el spec no
restringe en charset). La propiedad de seguridad que el test protege (serializacion JS
segura de texto no confiable) sigue cubierta igual de fuerte -- solo cambio el campo usado
para ejercitarla. `src_ts/to-mcpwasm-skill.ts` no se toco.

## Criterios de aceptación

- [ ] `python scripts/validate_contracts.py knowledge/contracts` exit 0 (ambos oraculos
  re-sellados: `define-tool.md`, `to-mcpwasm-skill.md`).
- [ ] `python scripts/validate_specs.py specs` exit 0.
- [ ] `python scripts/validate_okf.py knowledge` exit 0.
- [ ] `python scripts/validate_changelog.py` exit 0.
- [ ] `node --test tests_ts/define-tool.test.ts` 2x verde (15 tests, era 8).
- [ ] `node --test "tests_ts/*.test.ts"` 2x verde (53 tests, sin contaminacion cruzada).
- [ ] `npx tsc --noEmit` exit 0.
- [ ] `python scripts/validate_test_commands.py knowledge/contracts .` -- `define-tool.md`
  y `to-mcpwasm-skill.md` en `PASS`.

## Restricciones

- Tocar SOLO: `src_ts/define-tool.ts`, `tests_ts/define-tool.test.ts`,
  `tests_ts/to-mcpwasm-skill.test.ts`, `knowledge/contracts/define-tool.md`,
  `knowledge/contracts/to-mcpwasm-skill.md`, `README.md`, `docs.html` (rama `gh-pages`,
  seccion `defineTool`), `CHANGELOG.md`, `docs/reports/CONTRACT-47-REPORT.md`.
- Sin dependencias nuevas.
- `define-tool.ts` sigue sin red, sin `subprocess`/`child_process`, sin LLM.
- `src_ts/to-mcpwasm-skill.ts` NO se toca (T2 es puro ajuste de test).
- Fuera de alcance, deliberado: `outputSchema`/`resultSchema` (no existe en el spec ni en
  Chrome -- ver RECON), presupuesto de caracteres a nivel de parametro individual o de
  output de `execute` (requeriria recorrer el JSON Schema derivado; el gap mas accionable
  es name/description a nivel de tool, cubierto aca).
- NO publicar a npm ni taggear -- eso se hace por pedido explicito, fuera de este
  contrato.
- ABORTAR SI: la nueva regla de formato de `name` rompiera algun otro test ademas del ya
  identificado en `to-mcpwasm-skill.test.ts` -- se corrio la suite completa
  (`tests_ts/*.test.ts`) antes de dar T1 por cerrado, y no aparecio ningun otro caso.

## Checklist antes de delegar

- [x] RECON corrido: spec real de WebMCP (`ToolAnnotations`, charset de `name`), guia de
  seguridad de Chrome (limites recomendados), y el JSON de un sitio real del ecosistema
  (`render.com`) confirmando que `outputSchema` no existe en ningun lado -- las tres
  fuentes primarias, no de memoria.
- [x] Todo criterio de aceptación tiene comando + resultado esperado.
- [x] Red-team: el oraculo de T1 cubre: annotations presentes -> se copian; ausentes -> la
  clave no aparece; name con caracter invalido -> lanza; name >128 -> lanza; name >30 sin
  ser invalido -> avisa sin lanzar; description >500 -> avisa sin lanzar; spec normal ->
  cero avisos (control negativo). No hay forma de pasar el test_command sin que
  `defineTool` realmente valide el formato Y respete que los presupuestos son avisos, no
  errores.
- [x] Perímetro declarado arriba, sin tareas concurrentes.
- [x] Condiciones de aborto: ninguna se activo (T2 se detecto corriendo la suite completa
  ANTES de declarar T1 terminado, tal como exige el criterio de aceptación de "sin
  contaminación cruzada" heredado de CONTRACT-37).
