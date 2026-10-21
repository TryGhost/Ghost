# Installed Ghost tools

Tools shipped with Ghost for use against an installed release, including image
construction and custom-adapter checks. They work without the repository's
private gx workspace. See [tooling ownership](../../tools/README.md) before adding
an executable here.

| Source                                         | Format                                 | Purpose                                                                                                         |
| ---------------------------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| [validate-adapters.ts](validate-adapters.ts)   | TypeScript, compiled to CommonJS `.js` | Load explicitly named adapters and validate their base-class contract; optionally check duplicated dependencies |
| [lib/duplicate-deps.ts](lib/duplicate-deps.ts) | TypeScript, compiled to CommonJS `.js` | Private installed-tree dependency inspection used by adapter validation                                         |
| [warm-compile-cache.sh](warm-compile-cache.sh) | Bash                                   | Boot Ghost once to populate Node's on-disk compile cache during an image build                                  |
| [generate-data.ts](generate-data.ts)           | TypeScript, compiled to CommonJS `.js` | Populate the configured database with generated data                                                            |

The [Ghost manifest](../package.json) ships `bin/`; [Core's compiler configuration](../tsconfig.json)
includes its TypeScript sources. Invoke compiled files in the installed tree,
not raw `.ts` files that depend on the source-checkout loader.

## Adapter validation

From the installed Ghost directory:

```sh
node bin/validate-adapters.js --check-duplicate-deps storage:S3Storage
```

Substitute the adapter type/class installed in that tree; the example requires
that adapter to exist. Adapter specifications are explicit because runtime
configuration may not be present during an image build. The checker uses Core's
adapter loader and base-class definitions. The optional duplicate check compares
packages actually loaded from the adapter and Ghost dependency trees; a workspace
checkout with linked packages is not an equivalent installed-tree test.

## Data generation

From the installed Ghost directory, configured for a disposable database:

```sh
node bin/generate-data.js --quantities=members:10000 --seed=123
```

This runs Core's data generator with the same options as `pnpm gx data generate`
(see [working with test data](../../docs/contributing/test-data.md)). It has no
environment gate and writes into whatever database the tree is configured for,
so never point it at a site with data you need to keep. Outside `development`, MySQL needs
`ALLOW_INFILE_STREAM=1` to permit the infile streaming the generator uses.
Contributors in a checkout use the gx command instead.

Hosting and image tooling outside this repository runs it to seed installed
images, where there is no gx and Core internals should not be required directly.

## Compile-cache warming

From the installed image build tree:

```sh
bash bin/warm-compile-cache.sh
```

The script boots Ghost with shutdown-after-boot enabled. By default it uses a
throwaway SQLite database and snapshots/restores `content/` around a successful
run. `NODE_COMPILE_CACHE` overrides the default `.compile-cache` directory, which
must be writable. The warmed cache must match the runtime's absolute application
path, Node version and architecture. Run it after adding adapters or patches if
those modules should be warmed too.

This is an available image-build hook; its presence does not mean the repository's
production Dockerfile invokes it. Downstream image callers must be checked before
changing its path or contract.

## Adding or changing a tool

Use this folder when an installed Ghost tree is the required execution context.
Contributor-only generators and database experimentation belong in
[gx](../../tools/gx/README.md). Build/archive helpers belong in
[ghost/scripts](../scripts/README.md), including the shipped prune helper.

Keep private helpers in `lib/`. Top-level entrypoints are a downstream contract:
hosting and image tooling outside this repository runs them from installed trees.
[entrypoints.test.ts](../test/unit/bin/entrypoints.test.ts) pins the list, and
changes to this folder need code-owner review. Confirm those consumers before
removing, renaming or moving an entrypoint. Verify the emitted entrypoint and package contents
in a disposable installed tree, including resolution of Core and adapter imports;
a source-checkout test alone does not establish the installation contract.
