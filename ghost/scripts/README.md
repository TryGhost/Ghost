# Ghost build and packaging scripts

Ghost-owned asset generation, release archive assembly and pruning. Repository
builds invoke these through Ghost's package/Nx targets; downstream image builds
can also use the shipped prune helper. See [tooling ownership](../../tools/README.md)
for the boundary with repository automation, contributor commands and installed
tools.

| File                                                                 | Format                             | Purpose and invocation                                                                       | Placement                                |
| -------------------------------------------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------- |
| [build-card-assets.mts](build-card-assets.mts)                       | TypeScript ESM                     | Card CSS/JS manifest; `pnpm --filter ghost build:assets:cards`                               | Keep: Ghost asset build                  |
| [build-stale-assets.mts](build-stale-assets.mts)                     | TypeScript ESM                     | Rebuild stale browser assets before nodemon starts Ghost                                     | Keep: automatic build lifecycle          |
| [minify-assets.mts](minify-assets.mts)                               | TypeScript ESM                     | Browser JS bundling/minification; `pnpm --filter ghost build:assets:js`                      | Keep: Ghost asset build                  |
| [pack.mjs](pack.mjs)                                                 | JavaScript ESM                     | Ghost tarball assembly; root `pnpm archive` via Nx                                           | Keep: Ghost packaging                    |
| [prune.mts](prune.mts)                                               | TypeScript ESM                     | Prune built image/archive trees; Dockerfile, archive builder and downstream callers          | Keep: shipped build contract             |
| [export-query-parameter-policy.ts](export-query-parameter-policy.ts) | TypeScript, CommonJS through `tsx` | Validate/export normalized policy JSON; `pnpm query-parameter-policy:export --output <file>` | Open question: consumer/runtime contract |

## Build and distribution

Run asset and archive targets from the repository root after
[development setup](../../docs/contributing/development-setup.md). `pnpm archive`
builds its Nx prerequisites; it is not a command to run against an arbitrary
installed site. `pack.mjs` assembles the GitHub-release and npm-layout tarballs,
including the production workspace component archives and installation metadata.

`.mts` files are TypeScript ES modules run directly by Node. This folder is outside
Core's TypeScript compiler `include`; running a script with type stripping is not
proof that it has been typechecked. Keep source-format and checker coverage
explicit when changing it. `pack.mjs` is still JavaScript; conversion is separate
from deciding where packaging code belongs.

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

The exporter reads Core's canonical policy, validates it through Core's schema
and writes normalized JSON. It currently runs through `tsx` from a source checkout
and is not included in the release's shipped files. The remaining placement
question is who consumes that JSON and where the export runs.

- Source/build integration: keep it here and connect the actual build consumer.
- Installed-release integration: use `ghost/bin/` only after establishing compiled
  output, policy/schema paths and packaging without development dependencies.
- Contributor workflow: expose a gx command if that workflow is established.

Keep the current path and alias until that consumer contract is known. Running
something after a build does not alone make it an installed-release tool. A
repository search cannot rule out external callers; check them before moving or
removing the exporter.

## Adding a script

Add Ghost asset/archive work here. Use
[tools/scripts](../../tools/scripts/README.md) for repository-wide automation and
[gx](../../tools/gx/README.md) for contributor commands. Keep domain logic in Core.
For a move, check package targets, nodemon, Docker/archive callers, tests and the
shipped files list together. Verify source execution and any shipped invocation
in their respective environments.
