# fastwebmcp-start

A real, runnable quickstart. Installs the **published npm package**
(`"fastwebmcp": "^0.2.0"` in [`package.json`](package.json)) — not the monorepo's local
`src_ts/` — the same way an external consumer of the library would.

## What's here

- **`demo/`** — two browser demos (`imperative-demo.html`, `declarative-demo.html`) plus
  `index.html` linking both. Identical logic to the main repo's
  [`examples/`](../examples/), except the imports come from `'fastwebmcp'`, not a
  relative path into the monorepo.
- **`smoke/`** — two Node scripts, no browser needed:
  - `mock-smoke.mjs` — registers a tool against `createWebMcpMock()`, invokes it,
    proves Zod validation actually rejects bad input, proves `defineTool()`'s fail-fast
    on an invalid spec.
  - `mcpwasm-bridge.mjs` — generates a real mcpwasm `tool.js` via
    `toMcpwasmSkillSource()`, writes it to `smoke/out/` (gitignored), and checks it
    compiles as valid JavaScript.

## Run it

```sh
npm install
npm run smoke   # both smoke tests, no browser, no network
npm run serve   # builds the demos and serves this dir at http://127.0.0.1:8347
```

Then open `http://127.0.0.1:8347/demo/index.html`.

## What to actually expect

- **If your browser doesn't have WebMCP yet** (it's still an origin trial, Chrome
  149+): the imperative demo shows the no-op fallback message and still works normally
  for humans — that's the point, not a bug. Verified both ways: the sandboxed browser
  this repo's own CI/tooling uses shows the fallback; a real Chrome with the origin
  trial shows `add_todo` registered and `executeTool()` running for real.
- **The declarative demo's agent path can't be demoed by clicking the button
  yourself.** `event.agentInvoked` is a trust signal only a real browser-side agent can
  set — a normal human submit (including `form.requestSubmit()` from a script) always
  takes the `agentInvoked === false` branch. This is the same limitation documented in
  the main repo's [CONTRACT-45 report](../docs/reports/CONTRACT-45-REPORT.md), not
  something specific to this quickstart.

## Verifying the mcpwasm bridge against the real sandbox (manual, not automated)

`npm run smoke` only checks the generated `tool.js` is valid JavaScript — it doesn't run
it. To verify it against the real mcpwasm runtime (network + a third-party package at
run time, which is why this isn't wired into `npm run smoke` or CI — see
[CONTRACT-45](../docs/reports/CONTRACT-45-REPORT.md) for why):

```sh
npm run smoke                     # writes smoke/out/sum_numbers.tool.js
mkdir -p /tmp/mcpwasm-site/skills/sum_numbers
cp smoke/out/sum_numbers.tool.js /tmp/mcpwasm-site/skills/sum_numbers/tool.js
# then write an llms.txt pointing at it with the matching tool_sha256
# (the hash npm run smoke printed), and:
npx -y @rckflr/mcpwasm http://127.0.0.1:<port-serving-that-dir>
```

This is exactly what CONTRACT-45 did by hand; it's not automated here on purpose.

## Why this exists separately from `examples/`

`examples/` in the main repo imports `../src_ts/index.ts` directly — it tests the
monorepo's own source, which is how every contract in this project (34 onward) verified
the library during development. `fastwebmcp-start/` installs the real package from npm
instead, so it answers a different question: "if I were a brand-new consumer, does
`npm install fastwebmcp` actually work the way the README says?" Both are real,
verified, and kept — they check different things.
