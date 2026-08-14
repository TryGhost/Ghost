# @tryghost/theme-renderer

Ghost's theme rendering pipeline as an Express-free, web-standard package

This is an internal workspace package. See the
[internal package golden path](../README.md) for its standing architecture and
maintenance rules.

## Develop

This is a workspace package in the Ghost monorepo. From the package directory:

```bash
pnpm build   # compile to build/ with tsc (ESM)
pnpm test    # unit tests + type checks (incl. the WebWorker-lib browser project)
pnpm lint    # lint source and tests
```

### Browser (Web Worker) parity suite

The worker-parity suite renders the recorded fixtures inside a real Web Worker
in Chromium (Vitest browser mode). It is deliberately **outside** `pnpm test`
because it needs a Playwright Chromium download — fresh clones and CI stay
green without it. Run it explicitly:

```bash
pnpm exec playwright install chromium   # one-time browser download
pnpm browser:test                       # vitest run --config vitest.browser.config.ts
```

The static half of the browser guard — type-checking `src/` plus
`test/browser/` against `lib: ["ES2022", "WebWorker"]` with no Node types —
does run in every `pnpm test` via `test:types:browser`.

To re-record the fixtures the suite replays (requires a running Ghost dev
instance at `localhost:2368` or `GHOST_URL`):

```bash
node test/integration/record-browser-fixtures.ts
```

## Exceptions to the golden path

Recorded here per the [internal package golden path](../README.md)
("Existing packages and exceptions"). Provenance rules for the copied sources
live in [docs/provenance.md](docs/provenance.md).

- **Hybrid copy policy** — most of `src/` is near-verbatim code copied from
  `ghost/core/core/frontend` at a pinned commit; parity with the origin (the
  "oracle") wins over local style. Each copied file carries a provenance
  header naming its origin and transforms. See
  [docs/provenance.md](docs/provenance.md).
- **Lowered coverage thresholds** (`vitest.config.ts`) — copied bodies are
  covered by characterization/parity tests, not exhaustive unit tests; full
  branch coverage of ported code is not a goal of the extraction.
- **File-level eslint-disables on ported files** — copied files keep upstream
  shapes (`any`-typed plumbing, aliasing) rather than being rewritten to
  satisfy lint; the disables are per-file and listed in the provenance
  headers.
- **Second test project** (`test/browser/tsconfig.json` + `test:types:browser`
  script, `vitest.browser.config.ts` + `browser:test` script) — the standard
  surface has one test tsconfig; the extra project exists to statically prove
  worker-compatibility (WebWorker lib, no Node types), and the browser suite
  needs a Playwright Chromium so it stays out of the `test` glob (see above).
- **Host-realm `process` shim** (`src/utils/process-env-guard.ts`, imported
  first in `src/index.ts`) — `@tryghost/nql-lang` reads `process.env`
  unguarded at import time *and* on every filter parse, so in browsers/workers
  the package installs a minimal `process = {env: {}}` global when none
  exists. It is defined configurable/writable (hosts can delete or replace
  it), and it never touches realms that already have `process` (Node, Deno,
  Bun). Upstream fix candidate: guard the reads in nql-lang, then delete the
  shim.
