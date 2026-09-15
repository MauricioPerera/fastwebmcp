---
type: 'Task Contract'
title: 'Broker LSFA simulado para pruebas y demos'
description: 'Proporciona un broker determinista sin autoridad real que registra solicitudes y nunca inventa aprobaciones.'
tags: ['ccdd', 'lsfa', 'testing', 'simulation']

task: lsfa-testing
intent: "Proporcionar createLsfaBrokerMock para tests y demos claramente simuladas."
target: src_ts/lsfa-testing.ts
signature: "function createLsfaBrokerMock(options?: LsfaBrokerMockOptions): LsfaBrokerMock"
test_command: "node --test tests_ts/lsfa-testing.test.ts"
budget:
  cyclomatic_max: 6
  nesting_max: 2
  lines_max: 50
  params_max: 1
tests: "tests_ts/lsfa-testing.test.ts"
tests_sha256: "1c8bfa6ed98b5b0c124351a71050d8da37459cfffa451b97daaf384fcfbec215"
touch_only: ['src_ts/lsfa-testing.ts']
deps_allowed: ['./lsfa.ts']
forbids: ['network', 'subprocess', 'llm', 'real-authorization']
---

# Contract: broker LSFA simulado

## Intent

Dar un doble de pruebas para la frontera de [integracion LSFA](../lsfa-integration.md), sin
pretender que simula seguridad, captura o aprobacion reales.

## Interface

`createLsfaBrokerMock(options?)` devuelve `broker`, `requests`, `callCount` y `reset`.
Acepta resultados en cola o un handler asincrono explicito.

## Invariants

- Sin resultado ni handler, rechaza: nunca inventa `accepted`.
- Registra cada dispatch y respeta abort antes y durante la respuesta.
- No hace captura, red, persistencia ni ejecucion real.

## Examples

- `createLsfaBrokerMock({ results: [accepted] })` devuelve ese resultado una sola vez.
- Sin cola, `broker.request(...)` rechaza con `no result queued`.

## Do / Don't

- DO: etiquetarlo como simulacion en docs y demos.
- DON'T: usarlo como broker de produccion.

## Tests

Oraculo escrito primero en `tests_ts/lsfa-testing.test.ts` y congelado por `tests_sha256`.

## Constraints

PARAR y reportar si el mock requiere autoridad real o si hay que tocar el oraculo.
