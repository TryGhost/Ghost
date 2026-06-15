## Commands

- `pnpm test` — run the Vitest suite with coverage (this is the only test command; `pnpm test:unit` is the same thing).
- `pnpm lint` — run oxlint.
- Run a single test: `pnpm vitest run -t "<test name substring>"` (e.g. `pnpm vitest run -t "generateUnique"`).
- `pnpm ship` — runs tests, then `pnpm publish` and `git push --follow-tags`. Only succeeds with a clean working tree. Do not invoke unless the user explicitly asks to publish.

Node 22 or 24 is required (`engines.node: ^22.13.1 || ^24.0.0`). CI runs on Node 22 and 24 via `.github/workflows/test.yml`.

## Architecture

This is a published npm package (`ghost-storage-base`) consumed by Ghost storage adapters (e.g. S3, GCS, Azure adapters live in separate repos and extend this class). The entire public surface is a single class in `lib/BaseStorage.js` exported via `main: "./lib/BaseStorage"`.

Key design points that are easy to miss:

- `requiredFns = ['exists', 'save', 'serve', 'delete', 'read']` is declared as a non-writable property on every instance. The base class does **not** implement these — subclasses must. `generateUnique` and `getUniqueFileName` call `this.exists(...)`, so they will throw on the base class alone; tests stub `exists` directly on the instance.
- `getUniqueFileName` deliberately treats purely-numeric extensions (`.1`, `.342`) as part of the filename rather than as extensions, then sanitizes and suffixes the whole thing. This behavior is asserted by tests and is intentional — do not "fix" it.
- `getSanitizedFileName` only preserves `[A-Za-z0-9_@.]`; everything else (including all non-ASCII unicode) collapses to `-`. Filenames like `город.zip` become `-----.zip`. Tests pin this.
- Source is CommonJS (`require`/`module.exports`); tests are ESM (`import`). Vitest handles the interop — don't convert one to match the other.

## Testing constraints

`vitest.config.js` enforces **100% branches/functions/lines/statements coverage on `lib/BaseStorage.js`**. Any new branch in the source must come with a test, or `pnpm test` will fail on thresholds even if all assertions pass.

Tests use `node:assert/strict` and `vi.useFakeTimers()` for the date-dependent `getTargetDir` cases; the `afterEach` restores real timers.

## Compatibility

This package is consumed by external Ghost adapters in production. Changes to method signatures, the `requiredFns` list, or the sanitization/uniqueness behavior are breaking changes for downstream adapters — surface them explicitly rather than silently adjusting.
