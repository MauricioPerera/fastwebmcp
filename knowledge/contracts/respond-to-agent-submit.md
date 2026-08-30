---
type: 'Task Contract'
title: 'Responder a un submit disparado por un agente WebMCP Declarativo'
description: 'Envuelve SubmitEvent.agentInvoked/respondWith: si el submit vino de un agente, corre el handler y reenvia su resultado (o su rechazo) via respondWith.'
tags: ['webmcp', 'declarative', 'core']

task: respond-to-agent-submit
intent: "Si el submit fue disparado por un agente, ejecutar el handler y pasar su resultado a respondWith; si no, no hacer nada."
target: src_ts/respond-to-agent-submit.ts
signature: "function respondToAgentSubmit(event: AgentSubmitEventLike, handler: (event: AgentSubmitEventLike) => unknown): boolean"
test_command: "node --test tests_ts/respond-to-agent-submit.test.ts"
budget:
  cyclomatic_max: 4
  nesting_max: 2
  lines_max: 20
  params_max: 2
tests: "tests_ts/respond-to-agent-submit.test.ts"
tests_sha256: "9957fd07d32306c1bb37277f81bfa72194a2282fcf469064f13ee0d5850a6c29"
touch_only: ['src_ts/respond-to-agent-submit.ts']
deps_allowed: []
forbids: ['network', 'subprocess', 'llm']
---

# Contract: Responder a un submit disparado por un agente WebMCP Declarativo

## Intent
El explainer de la API Declarativa (verificado contra fuente primaria —
`webmachinelearning/webmcp/blob/main/declarative-api-explainer.md`) agrega a
`SubmitEvent`:
```
readonly attribute boolean agentInvoked;
undefined respondWith(Promise<any> agentResponse);
```
Un `<form>` anotado con [`defineDeclarativeTool`](./define-declarative-tool.md) necesita
un listener de `submit` que distinga "me disparo un agente" de "lo mando un humano" y, en
el primer caso, ejecute la logica de la tool y entregue el resultado via `respondWith`.
`respondToAgentSubmit` es ese puente — analogo al `execute` envuelto de `defineTool` en
la API Imperativa, pero para el flujo Declarativo.

## Interface
```
interface AgentSubmitEventLike {
  readonly agentInvoked: boolean;
  respondWith(promise: Promise<unknown>): void;
}

function respondToAgentSubmit(
  event: AgentSubmitEventLike,
  handler: (event: AgentSubmitEventLike) => unknown,
): boolean
```

## Invariants
- Si `event.agentInvoked` es `false`: no llama a `handler` ni a `event.respondWith`;
  devuelve `false`.
- Si `event.agentInvoked` es `true`: llama a `event.respondWith(p)` exactamente una vez,
  donde `p` es una promesa que resuelve al valor que devuelve `handler(event)` (sync o
  async) — y devuelve `true`.
- Si `handler` lanza sincronicamente, la promesa pasada a `respondWith` RECHAZA con ese
  error — nunca escapa como excepcion no capturada ni se pierde silenciosamente.
- `handler` recibe el `event` original como unico argumento.
- No hace red, `subprocess`/`child_process`, ni llamadas a un LLM.

## Examples
- `event.agentInvoked === false` -> `respondToAgentSubmit(event, handler)` devuelve
  `false`, `handler` nunca se llama.
- `event.agentInvoked === true`, `handler = () => ({ status: 'submitted' })` ->
  `event.respondWith` recibe una promesa que resuelve a `{ status: 'submitted' }`,
  devuelve `true`.
- `handler = () => { throw new Error('boom') }` con `agentInvoked === true` -> la promesa
  pasada a `respondWith` rechaza con ese error.

## Do / Don't
- DO: envolver la invocacion de `handler` en `Promise.resolve().then(...)` (o
  equivalente) para que un throw sincronico se convierta en rechazo, no en excepcion.
- DON'T: llamar `event.respondWith` cuando `agentInvoked` es `false` — un submit humano
  sigue el flujo normal del form.
- DON'T: agregar red, `subprocess`/`child_process`, ni ninguna llamada a un LLM.

## Tests
(Los tests estan en `tests_ts/respond-to-agent-submit.test.ts` — escritos ANTES de la
implementación; oráculo congelado, sellado por `tests_sha256`.)

## Constraints
- PARAR y reportar si el `intent` resulta imposible de cumplir sin violar `touch_only` o
  `forbids`.
