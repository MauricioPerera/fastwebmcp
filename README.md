# fastwebmcp

[![npm](https://img.shields.io/npm/v/fastwebmcp)](https://www.npmjs.com/package/fastwebmcp)

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
`createWebMcpMock()` · `defineDeclarativeTool(form, spec)` · `respondToAgentSubmit(event, handler)`

## Development / methodology

This repository is built with [KDD (Knowledge-Driven Development)](https://mauricioperera.github.io/KDD/):
every function ships with a frozen test oracle authored before the implementation, and
project-level work is tracked as numbered execution contracts under
[`specs/`](specs/) with verified reports in [`docs/reports/`](docs/reports/). See
[`AGENTS.md`](AGENTS.md) and [`knowledge/index.md`](knowledge/index.md) if you're
contributing or want the full methodology reference.

## License

MIT — see [LICENSE](LICENSE).
