# @tryghost/adapter-base-import-files

The base class, key rules and contract test suite for Ghost's `import-files`
adapter category: the place an import's uploaded file (or the rows derived from
it) waits between the request that accepted it and the job that processes it.

A store holds private bytes under a key Ghost composes, streams them in and out,
and deletes them when the import finishes. It never serves them and never lists
them. Ghost ships a local file store and an S3 store under
`ghost/core/core/server/adapters/import-files/`.

## Contract

```ts
put(key, body: Buffer | Readable, { contentType, contentLength? }): Promise<{ size, contentType }>
get(key): Promise<Readable>              // rejects with a NotFoundError (code IMPORT_FILE_NOT_FOUND) when the key is gone
head(key): Promise<{ size, contentType } | null>
delete(key): Promise<void>               // a missing key resolves
```

A stream must declare its `contentLength` so a store can choose one upload or an
upload in parts without buffering; a body that arrives shorter or longer than
declared is refused and nothing is kept. Use `isImportFileNotFound(err)` to
recognise a missing file. Keys are relative, made of segments of
`[A-Za-z0-9._-]`, with no `..`, no leading slash and no empty segment;
`assertValidKey` enforces this and every store calls it.

Run the exported contract suite against every implementation:

```ts
import { runImportFileStoreContractTests } from '@tryghost/adapter-base-import-files/contract-test-suite';

runImportFileStoreContractTests(() => new MyStore(), { describe, it });
```

## Develop

This is a workspace package in the Ghost monorepo. From the repo root:

```bash
pnpm --filter @tryghost/adapter-base-import-files build   # compile to build/ with tsc (ESM)
pnpm --filter @tryghost/adapter-base-import-files test    # type-check + unit tests
```

In-monorepo consumers resolve this package via the `source` export condition
(raw `src/*.ts`, no build needed in dev/test). Production uses the compiled
`build/` output.

This package is ESM-only and compiled with `tsc` (`module: nodenext`). Relative
imports in `src/` must carry an explicit extension; write the real `.ts` one and
`tsc` rewrites it to `.js` on emit. `ghost/core` is CommonJS and consumes this
package via `require()`, so keep module-level initialization synchronous: no
top-level `await` anywhere in this package.
