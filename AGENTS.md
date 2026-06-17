## Commands

- `pnpm build` — compile `src/` to `dist/` with `tsc`.
- `pnpm test` — run the Vitest suite with coverage (this is the only test command; `pnpm test:unit` is the same thing). Vitest runs against the TS source directly; you do not need to `pnpm build` first.
- `pnpm lint` — run oxlint.
- Run a single test: `pnpm vitest run -t "<test name substring>"` (e.g. `pnpm vitest run -t "generateUnique"`).
- `pnpm ship` — runs tests, then `pnpm publish` and `git push --follow-tags`. The build runs automatically via the `prepare` script (see below). Only succeeds with a clean working tree. Do not invoke unless the user explicitly asks to publish.

### Build lifecycle

The `prepare` script (`npm run build`) is what guarantees `dist/` exists in every shipped form of the package: `pnpm publish`, `npm publish`, package tarballs, local installs in this repo, and **`npm install git+...` from a consumer**. The git-install case is the important one — `prepublishOnly` does not fire there, so a consumer installing from a git ref would otherwise get a tarball with no compiled output and `require('ghost-storage-base')` would throw. Do not replace `prepare` with `prepublishOnly` without restoring equivalent coverage.

Node 22 or 24 is required (`engines.node: ^22.13.1 || ^24.0.0`). CI runs on Node 22 and 24 via `.github/workflows/test.yml`.

## Architecture

This is a published npm package (`ghost-storage-base`) consumed by Ghost storage adapters (e.g. S3, GCS, Azure adapters live in separate repos and extend this class). The entire public surface is a single class in `src/BaseStorage.ts`, compiled to `dist/BaseStorage.js` (+ `.d.ts`) by `pnpm build` and exposed via `main: "./dist/BaseStorage.js"` / `types: "./dist/BaseStorage.d.ts"`.

Key design points that are easy to miss:

- `requiredFns = ['exists', 'save', 'serve', 'delete', 'read']` is declared as a non-writable property on every instance. The base class does **not** implement these — subclasses must. `generateUnique` and `getUniqueFileName` call `this.exists(...)`, so they will throw on the base class alone; tests stub `exists` directly on the instance.
- `getUniqueFileName` deliberately treats purely-numeric extensions (`.1`, `.342`) as part of the filename rather than as extensions, then sanitizes and suffixes the whole thing. This behavior is asserted by tests and is intentional — do not "fix" it.
- `getSanitizedFileName` only preserves `[A-Za-z0-9_@.]`; everything else (including all non-ASCII unicode) collapses to `-`. Filenames like `город.zip` become `-----.zip`. Tests pin this.
- Source uses `export = StorageBase` so the compiled CJS emits `module.exports = StorageBase` — preserving `const StorageBase = require('ghost-storage-base')` for downstream adapters. Do not change to `export default`; that would break the require shape.
- Tests are ESM (`import`) and import directly from `../src/BaseStorage.ts`; Vitest handles the TS + CJS-interop transparently. The shipped artifact in `dist/` is CJS — don't change the test imports to point at `dist/`.

## Testing constraints

`vitest.config.js` enforces **100% branches/functions/lines/statements coverage on `src/BaseStorage.ts`**. Any new branch in the source must come with a test, or `pnpm test` will fail on thresholds even if all assertions pass.

Tests use `node:assert/strict` and `vi.useFakeTimers()` for the date-dependent `getTargetDir` cases; the `afterEach` restores real timers.

## Compatibility

This package is consumed by external Ghost adapters in production. Changes to method signatures, the `requiredFns` list, or the sanitization/uniqueness behavior are breaking changes for downstream adapters — surface them explicitly rather than silently adjusting.
