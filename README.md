# fastwebmcp

[![CI](https://github.com/MauricioPerera/fastwebmcp/actions/workflows/validate.yml/badge.svg)](https://github.com/MauricioPerera/fastwebmcp/actions/workflows/validate.yml)
[![npm](https://img.shields.io/npm/v/fastwebmcp)](https://www.npmjs.com/package/fastwebmcp)
[![GitHub release](https://img.shields.io/github/v/release/MauricioPerera/fastwebmcp)](https://github.com/MauricioPerera/fastwebmcp/releases/tag/v0.4.0)
[![license](https://img.shields.io/npm/l/fastwebmcp)](LICENSE)

FastMCP-style ergonomics for [WebMCP](https://github.com/webmachinelearning/webmcp): typed
Zod builders over the browser's Imperative and Declarative APIs, with safe no-op +
warning degradation when `document.modelContext` isn't available (WebMCP is still an
origin trial as of Chrome 149 — most visitors won't have it yet).

## Install

```sh
npm install fastwebmcp
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

## Testing your own tools without a real browser

```ts
import { createWebMcpMock } from 'fastwebmcp';

const mock = createWebMcpMock();
globalThis.document = mock.document as any;

registerYourTools();

const result = await mock.invokeTool('add_todo', { text: 'Buy milk' });
```

`invokeTool` runs the real `execute` your tool was registered with (Zod parsing
included) — not a reimplementation.

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

Two runnable demo pages, verified against a real `document.modelContext`, live in
[`examples/`](examples/):

```sh
npm run build:examples
npx http-server .   # or any static file server
# open examples/ux-page/imperative-demo.html and .../declarative-demo.html
```

## API surface

`supportsWebMcp()` · `defineTool(spec)` · `registerTool(spec, options?)` ·
`createWebMcpMock()` · `defineDeclarativeTool(form, spec)` · `respondToAgentSubmit(event, handler)` ·
`toMcpwasmSkillSource(tool, options?)`

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

## License

MIT — see [LICENSE](LICENSE).
