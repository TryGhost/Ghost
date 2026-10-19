# Ghost build and packaging scripts

Ghost-owned asset generation, release archive assembly, pruning and policy
exports. Repository builds invoke these through Ghost's package/Nx targets;
downstream image builds can also use the shipped prune helper. See [tooling ownership](../../tools/README.md)
for the boundary with repository automation, contributor commands and installed
tools.

| File                                                                 | Format                             | Purpose and invocation                                                                       | Placement                       |
| -------------------------------------------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------- |
| [build-card-assets.mts](build-card-assets.mts)                       | TypeScript ESM                     | Card CSS/JS manifest; `pnpm --filter ghost build:assets:cards`                               | Keep: Ghost asset build         |
| [build-stale-assets.mts](build-stale-assets.mts)                     | TypeScript ESM                     | Rebuild stale browser assets before nodemon starts Ghost                                     | Keep: automatic build lifecycle |
| [minify-assets.mts](minify-assets.mts)                               | TypeScript ESM                     | Browser JS bundling/minification; `pnpm --filter ghost build:assets:js`                      | Keep: Ghost asset build         |
| [pack.mjs](pack.mjs)                                                 | JavaScript ESM                     | Ghost tarball assembly; root `pnpm archive` via Nx                                           | Keep: Ghost packaging           |
| [prune.mts](prune.mts)                                               | TypeScript ESM                     | Prune built image/archive trees; Dockerfile, archive builder and downstream callers          | Keep: shipped build contract    |
| [export-query-parameter-policy.ts](export-query-parameter-policy.ts) | TypeScript, CommonJS through `tsx` | Validate/export normalized policy JSON; `pnpm query-parameter-policy:export --output <file>` | Keep: Ghost policy export       |

## Build and distribution

Run asset and archive targets from the repository root after
[development setup](../../docs/contributing/development-setup.md). `pnpm archive`
builds its Nx prerequisites; it is not a command to run against an arbitrary
installed site. `pack.mjs` assembles the GitHub-release and npm-layout tarballs,
including the production workspace component archives and installation metadata.

`.mts` files are TypeScript ES modules run directly by Node. This folder is outside
Core's TypeScript compiler `include`; running a script with type stripping is not
proof that it has been typechecked. Keep source-format and checker coverage
explicit when changing it. The policy exporter is checked without emitting files
through `scripts/tsconfig.json`, included in `pnpm --filter ghost test:types`.
`pack.mjs` is still JavaScript; conversion is separate from deciding where
packaging code belongs.

The [Ghost manifest](../package.json) ships `scripts/prune.mts`, rather than all of
`scripts/`. The asset builders, archive builder and policy exporter are checkout
tools. Preserve that explicit distribution boundary.

## Pruning a built tree

Inspect a disposable installed tree from its application directory:

```sh
node scripts/prune.mts . --profile=image --dry-run
```

The `image` profile handles source files and production dependencies. The `archive`
profile handles the extracted archive tree without installed dependencies.
`--report=<file>` writes surviving package sizes and source-map measurements.
The production Dockerfile and `pack.mjs` call the same implementation. Preserve
`scripts/prune.mts` for downstream builds; sharing installed-tree execution with
`bin/` does not require breaking an established packaging path.

## Query-parameter policy export

The exporter produces validated JSON for external infrastructure integrations.
It runs through `tsx` from a source checkout and is excluded from installed
releases. See the
[policy contract](../core/server/web/query-parameter-policy/README.md) for the
source, schema and invocation. Tests exercise the exporter itself; middleware
and policy tests use Core's policy directly.

For another Ghost-owned policy export:

- Keep the canonical policy, schema and contract documentation in its owning Core
  subsystem. Runtime code and the exporter should share that validation.
- Add a thin exporter here with an explicit output path. Document its command,
  schema version, consumer expectations and checkout requirements. Tools that
  must run in an installed release belong in `ghost/bin`.
- Add it to the appropriate typecheck and test validation, output content and
  byte-for-byte repeatability. Keep deployment and synchronization with external
  systems in the consuming integration.

## Adding a script

Add Ghost asset/archive work and policy exports here. Use
[tools/scripts](../../tools/scripts/README.md) for repository-wide automation and
[gx](../../tools/gx/README.md) for contributor commands. Keep domain logic in Core.
For a move, check package targets, nodemon, Docker/archive callers, tests and the
shipped files list together. Verify source execution and any shipped invocation
in their respective environments.
