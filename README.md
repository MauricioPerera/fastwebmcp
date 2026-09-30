# fastwebmcp

[![CI](https://github.com/MauricioPerera/fastwebmcp/actions/workflows/validate.yml/badge.svg)](https://github.com/MauricioPerera/fastwebmcp/actions/workflows/validate.yml)
[![npm](https://img.shields.io/npm/v/fastwebmcp)](https://www.npmjs.com/package/fastwebmcp)
[![GitHub release](https://img.shields.io/github/v/release/MauricioPerera/fastwebmcp)](https://github.com/MauricioPerera/fastwebmcp/releases)
[![license](https://img.shields.io/npm/l/fastwebmcp)](LICENSE)

Typed [WebMCP](https://github.com/webmachinelearning/webmcp) tools for browser agents,
with FastMCP-style ergonomics. Define inputs with Zod, run your application's own
handlers, and let an agent work on the same visible page as the user.

The library supports imperative tools, declarative HTML forms, confirmed async
registration, testing helpers and optional LSFA integration. An interactive
[text editor](examples/text-editor/) demonstrates eight tools acting on a real document.

| Capability | What it provides |
| --- | --- |
| Typed tools | Zod input parsing and generated JSON Schema |
| Async registration | Await native registration and handle its original errors |
| HTML forms | Declarative tool attributes and agent-submit responses |
| Lifecycle | AbortSignal cleanup for registered tools |
| Testing | Invoke real handlers through an in-memory WebMCP mock |
| Optional LSFA | Delegate non-sensitive intent to an application-owned broker |
| Text editor | Visible editing, revision checks, undo/redo and local drafts |

WebMCP availability depends on the browser and its configuration. Use
`supportsWebMcp()` to check it. When `document.modelContext` is missing, registration
returns `false` and emits a warning; the text editor remains usable manually.

## Install

```sh
npm install fastwebmcp
```

The async registration APIs and text editor described here are currently tracked
under **Unreleased** in the [changelog](CHANGELOG.md). The npm command installs
the published release; to try the repository changes, build from source:

```sh
git clone https://github.com/MauricioPerera/fastwebmcp.git
cd fastwebmcp
npm ci
npm run build
npm run build:examples
```

## Imperative API

```ts
import { z } from 'zod';
import { registerTool } from 'fastwebmcp';

registerTool({
  name: 'add_todo',
  description: 'Add a todo item to the list.',
  inputSchema: z.object({ text: z.string().min(1) }),
  execute: async ({ text }) => {
    // ... your logic, DOM update, etc.
    return `Added: ${text}`;
  },
});
```

`registerTool` validates and normalizes the spec with `defineTool` (deriving the JSON
Schema from the Zod schema via `z.toJSONSchema`, and parsing every call's input before
your handler runs), then calls `document.modelContext.registerTool(...)` if the browser
supports it — falling back to a `console.warn` no-op otherwise, so your page never
breaks on an unsupported browser.

For confirmed registration, use `await registerToolAsync(spec, options)`. It resolves
to `true` only after the native registration completes, resolves to `false` when
WebMCP is unavailable, and rejects with the original browser error (for example,
duplicate names or denied permissions). Handle the rejection with `try`/`catch`.

```ts
import { z } from 'zod';
import { registerToolAsync } from 'fastwebmcp';

try {
  const registered = await registerToolAsync({
    name: 'sum_numbers',
    description: 'Add two numbers and return their sum.',
    inputSchema: z.object({ a: z.number(), b: z.number() }),
    execute: ({ a, b }) => ({ sum: a + b }),
  });
  console.log(registered ? 'Tool registered' : 'WebMCP unavailable');
} catch (error) {
  console.error('Tool registration failed', error);
}
```

The synchronous `registerTool` remains compatible: `true` means the request was
dispatched, and a later native rejection emits a warning. Synchronous errors still
propagate. The browser API's registration contract is documented in the
[WebMCP specification](https://webmachinelearning.github.io/webmcp/#dom-modelcontext-registertool).

`defineTool` also validates `name` against the WebMCP spec's own charset (1-128 chars,
`[A-Za-z0-9_.-]`), and warns — never throws — if `name`/`description` exceed the length
Chrome's [tool security guide](https://developer.chrome.com/docs/ai/webmcp/secure-tools)
recommends for reliable agent results. Pass `annotations: { readOnlyHint, untrustedContentHint }`
to flag a tool as side-effect-free or as returning untrusted data — it's forwarded as-is
to `document.modelContext.registerTool()`. Pass `title` for an optional human-readable
label; also forwarded as-is.

## Declarative API

```ts
import { defineDeclarativeTool, respondToAgentSubmit } from 'fastwebmcp';

const form = document.querySelector('form')!;

defineDeclarativeTool(form, {
  name: 'submit_support_request',
  description: 'Submit a request for support.',
  fields: [{ name: 'topic', description: 'Determines what team this routes to.' }],
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const handled = respondToAgentSubmit(event as any, () => ({ status: 'submitted' }));
  if (!handled) {
    // a human submitted the form -- handle it however you normally would
  }
});
```

`defineDeclarativeTool` sets the `toolname`/`tooldescription`/`toolautosubmit`/
`toolparamdescription` attributes the [WebMCP Declarative API explainer](https://github.com/webmachinelearning/webmcp/blob/main/declarative-api-explainer.md)
specifies. The JSON Schema the browser derives from the form's fields is not something
this library computes or validates — that algorithm is still unspecified upstream.

`autoSubmit: false` removes an existing `toolautosubmit` attribute. Omitting the
option preserves the form's current setting. Custom form-like objects must provide
`removeAttribute` when explicitly disabling autosubmit; otherwise validation fails
before the form is modified. Native HTML forms already provide this method.

## Testing your own tools without a real browser

```ts
import {
  createWebMcpMock,
  registerToolAsync,
  withMockDocument,
  createMockAgentSubmitEvent,
  respondToAgentSubmit,
} from 'fastwebmcp';

const mock = createWebMcpMock();

// Isolated execution without polluting globalThis:
await withMockDocument(mock, async () => {
  registerYourTools();
  const result = await mock.invokeTool('add_todo', { text: 'Buy milk' });
});

// Check registrations and clean up between tests:
mock.hasTool('add_todo'); // true
mock.reset(); // clears all registered tools for the next test

// Unregistration via AbortSignal (WebMCP spec):
const controller = new AbortController();
await withMockDocument(mock, async () => {
  await registerToolAsync(mySpec, { signal: controller.signal });
  controller.abort(); // tool is automatically removed from mock
});

// Testing declarative form submissions:
const { event, waitForResponse } = createMockAgentSubmitEvent();
respondToAgentSubmit(event, () => ({ status: 'processed' }));
const response = await waitForResponse(); // { status: 'processed' }
```

`invokeTool` runs the real `execute` your tool was registered with (Zod parsing
included) — not a reimplementation. `withMockDocument` isolates `globalThis.document`
safely until the callback returns or its promise settles, and restores the original
property descriptor even on rejection. Run async scopes in series, or nest them
with `await`: simultaneous independent scopes share the same global document and
cannot isolate each other. `hasTool(name)`, `getTool(name)` and `reset()`
make it easy to assert tool registrations and isolate tests in suites like Jest, Vitest,
or `node:test`.

`reset()` also removes registration abort listeners. The mock retains its existing
overwrite-by-name behavior; unlike the native API, it does not reject duplicate
names. It is a handler test harness, rather than a complete browser implementation.

## Optional LSFA integration

Use `fastwebmcp/lsfa` when a WebMCP tool needs sensitive local capture or explicit human
confirmation. The agent-facing schema must contain only non-sensitive intent. A trusted
broker supplied by your application owns LSFA policy, risk, secure fields, presentation,
confirmation, expiry, binding, single-use consumption and the side effect itself.

```ts
import { z } from 'zod';
import { registerLsfaTool, type LsfaBroker } from 'fastwebmcp/lsfa';

declare const trustedBroker: LsfaBroker; // your LSFA host adapter, not FastWebMCP

registerLsfaTool({
  name: 'send_email_securely',
  description: 'Ask the trusted local broker to confirm and send an email.',
  inputSchema: z.object({ recipient: z.string().email(), subject: z.string() }),
  intent: {
    operation: 'send_email',
    purpose: 'Send only after local confirmation.',
    presentation: { mode: 'form', profile: 'confirmation', locale: 'en-US' },
  },
  broker: trustedBroker,
}, { exposedTo: ['https://trusted-agent.example'] });
```

Schemas containing password, secret, token, credentials, API keys, PIN, OTP or TOTP
name tokens are rejected recursively (snake_case, kebab-case and camelCase); ordinary
names such as `shipping_address` and metrics such as `token_count` are allowed.
Names are a heuristic, so the application must still keep sensitive values out of
agent input. `registerLsfaToolAsync` provides the same confirmed registration as
`registerToolAsync`. Both LSFA registration variants parse each invocation once.
The broker result is also strict and sanitized; captured
values never return through WebMCP. This route is imperative-only, so it never enables
`toolautosubmit`. Import `createLsfaBrokerMock` from `fastwebmcp/lsfa/testing` only in
tests or demos: it records calls and returns explicitly queued results, but performs no
capture, authorization or execution and provides no production security guarantees.

The included [`LSFA demo`](examples/ux-page/lsfa-demo.html) is prominently marked as a
simulation. A real broker transport (HTTP loopback, Native Messaging or extension) is
intentionally outside this first contract.

The result shape follows LSFA's published 0.2 schema: only `status` and `operation` are
required; `request_id`, `risk`, boolean `checks`, `stored_refs` (`true`, `false`,
`present`, or `absent`) and `error_code` are optional. The presentation validator follows
the 0.3 modes, themes and layout limits. A profile-only object is accepted as an adapter
hint for convenience; the broker must add/choose the canonical mode and validate the
complete LSFA request against its own policy before showing anything.

## Framework Integration (React, Next.js, Vue)

WebMCP tools in single-page applications should register when components mount and
clean up when they unmount using an `AbortController`:

### React / Next.js
```tsx
import { useEffect } from 'react';
import { registerTool, type ToolSpec } from 'fastwebmcp';
import type { ZodType } from 'zod';

export function useWebMcpTool<T extends ZodType>(spec: ToolSpec<T>) {
  useEffect(() => {
    const controller = new AbortController();
    registerTool(spec, { signal: controller.signal });
    return () => controller.abort(); // Automatically unregisters on unmount
  }, [spec.name]);
}
```

### Vue 3 (Composition API)
```ts
import { onMounted, onUnmounted } from 'vue';
import { registerTool, type ToolSpec } from 'fastwebmcp';
import type { ZodType } from 'zod';

export function useWebMcpTool<T extends ZodType>(spec: ToolSpec<T>) {
  const controller = new AbortController();
  onMounted(() => {
    registerTool(spec, { signal: controller.signal });
  });
  onUnmounted(() => {
    controller.abort();
  });
}
```

## Publishing the same schema to mcpwasm

```ts
import { defineTool, toMcpwasmSkillSource } from 'fastwebmcp';

const tool = defineTool({
  name: 'sum_numbers',
  description: 'Sum two numbers a and b.',
  inputSchema: z.object({ a: z.number(), b: z.number() }),
  execute: async ({ a, b }) => a + b, // browser-only, never auto-translated
});

console.log(
  toMcpwasmSkillSource(tool, {
    handlerBody: 'return args.a + args.b;', // you write this: no DOM in the sandbox
  }),
);
```

`toMcpwasmSkillSource` reuses the JSON Schema `defineTool` already derived from your Zod
spec to emit the `registerTool({...})` source [mcpwasm](https://github.com/MauricioPerera/mcpwasm)
expects in a `tool.js`. This is schema-only, not a runtime bridge: mcpwasm's `handler`
runs sandboxed inside QuickJS-wasm with no DOM, no `fetch`, no `window` — only
`registerTool`, `host.fetchOrigin`, and bare ECMAScript — so your `execute` (which exists
specifically to touch the page) can't run there unmodified. What crosses the boundary is
`name`/`description`/`inputSchema`; the sandboxed `handler` body is always yours to write
(the function defaults to an explicit `TODO` stub if you don't supply `handlerBody`). It
doesn't reimplement mcpwasm's own `@rckflr/llms-skills` CLI, which stays the tool for
scaffolding, hash-sealing, and publishing.

## Examples

Runnable demo pages, verified against a real `document.modelContext`, live in
[`examples/`](examples/):

```sh
npm run build:examples
python -m http.server 8349 --bind 127.0.0.1   # or any static file server
```

Open one of these pages on the local server:

- [Text editor](http://127.0.0.1:8349/examples/text-editor/)
- [Imperative tools](http://127.0.0.1:8349/examples/ux-page/imperative-demo.html)
- [Declarative forms](http://127.0.0.1:8349/examples/ux-page/declarative-demo.html)
- [LSFA simulation](http://127.0.0.1:8349/examples/ux-page/lsfa-demo.html)

The [text editor](examples/text-editor/) exposes eight WebMCP tools to read,
write, insert, replace, find, select, undo and redo the visible document. It saves
the draft locally and records each tool call on screen. Edits require the last
read revision to protect concurrent human changes. See its
[run instructions](examples/text-editor/README.md) and
[verification report](docs/reports/CONTRACT-54-REPORT.md).

| Editor tool | Action |
| --- | --- |
| `editor_read` | Read text, title, selection, statistics and revision |
| `editor_write` | Replace text and optionally the title |
| `editor_insert` | Insert at a specified position |
| `editor_replace` | Replace the first or all literal matches |
| `editor_find` | Return matching text ranges |
| `editor_select` | Highlight a range in the visible textarea |
| `editor_undo` | Restore the previous document state |
| `editor_redo` | Restore an undone change |

For an agent workflow, discover the page's registered WebMCP tools, call
`editor_read`, then pass its `revision` as `expectedRevision` to edits and
selection. A stale revision is rejected without changing the document. Read
again before retrying. Positions use zero-based UTF-16 offsets.

All eight tools were invoked through native WebMCP in Codex's in-app browser.
The example also has an automated regression test. Drafts are stored in
localStorage; undo history lasts for the current page session. The user can
download the document as `.txt` from the toolbar.

## API surface

| Import | Functions |
| --- | --- |
| `fastwebmcp` | `supportsWebMcp`, `defineTool`, `registerTool`, `registerToolAsync`, `defineDeclarativeTool`, `respondToAgentSubmit`, `toMcpwasmSkillSource` |
| `fastwebmcp` testing helpers | `createWebMcpMock`, `withMockDocument`, `createMockAgentSubmitEvent` |
| `fastwebmcp/lsfa` | `defineLsfaTool`, `registerLsfaTool`, `registerLsfaToolAsync` |
| `fastwebmcp/lsfa/testing` | `createLsfaBrokerMock` |

LSFA builders are also exported from `fastwebmcp` for convenience.

## Changelog

Every release is documented in [`CHANGELOG.md`](CHANGELOG.md), including the RECON
findings and known limits behind each one — not just a list of what shipped.

## Development / methodology

This repository is built with [KDD (Knowledge-Driven Development)](https://mauricioperera.github.io/KDD/):
every function ships with a frozen test oracle authored before the implementation, and
project-level work is tracked as numbered execution contracts under
[`specs/`](specs/) with verified reports in [`docs/reports/`](docs/reports/). See
[`AGENTS.md`](AGENTS.md) and [`knowledge/index.md`](knowledge/index.md) if you're
contributing or want the full methodology reference.

Running the test suite locally (`npm test`) needs **Node.js 23.6+** — it relies on
Node's native `.ts` execution (`node --test tests_ts/**/*.test.ts`), which is separate
from the `engines.node: ">=18"` this package declares for consumers of the published
`dist/` (plain compiled JS, no native `.ts` support needed there).

## License

MIT — see [LICENSE](LICENSE).
