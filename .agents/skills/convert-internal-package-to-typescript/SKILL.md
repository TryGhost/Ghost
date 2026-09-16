---
name: convert-internal-package-to-typescript
description: Convert a legacy internal Ghost workspace package from JavaScript or CommonJS to the repository's TypeScript and ESM golden path while preserving file history and runtime compatibility. Use when modernizing an existing or newly migrated private package, including staged lib-to-src moves, JS-to-TS renames, consumer analysis, and package or archive verification.
---

# Convert an internal package to TypeScript

Modernize an internal package without mixing mechanical moves with semantic
changes or obscuring file history. Treat `packages/README.md` as the authority
for the package's lifetime architecture; this skill owns only the conversion
workflow.

## Confirm this workflow applies

Read `packages/README.md` completely, then inspect the package, its consumers,
and comparable current packages. Confirm that the package is internal-only and
can adopt the documented single-build TypeScript and ESM contract.

Before editing:

1. Find every import, `require()`, export, runtime asset and path reference.
2. Inspect package metadata, build and test configuration, release/archive
   inclusion, and any dynamic module loading.
3. Run the package's existing tests and representative consumer checks to
   establish a baseline.
4. Identify supported consumers that cannot load the golden-path ESM output.

If the package has an active independent release or third-party support
contract, or requires a format that conflicts with the golden path, stop and
establish its support contract instead of applying this workflow mechanically.
Deprecated historical npm versions do not by themselves block conversion.

Read
[`references/history-and-verification.md`](references/history-and-verification.md)
completely before planning the commits.

## Preserve lineage with three focused commits

Keep each commit independently valid and verify rename detection before moving
on. Avoid formatting or opportunistic cleanup in the mechanical commits.

### 1. Move sources from `lib` to `src`

Use `git mv` to move the source tree. Update only references that must change
for the new path, such as test imports, build inputs and package metadata. Do
not change module syntax, file extensions or implementation in this commit.

Use the subject `Moved <package> sources from lib to src` when that accurately
describes the change.

### 2. Change file extensions to TypeScript

Use `git mv` for `.js` to `.ts` renames. Add only the minimum configuration and
syntax adjustments needed for the renamed sources to parse and for this commit
to remain coherent. Preserve behavior and defer meaningful typing and ESM
conversion to the next commit.

Use the subject `Changed <package> file extensions to TypeScript`.

### 3. Convert the implementation to TypeScript and ESM

Apply the package contract from `packages/README.md`: shared config packages,
minimal package-local config, ESM metadata and exports, standard scripts, and a
single compiled output unless a verified consumer requires an exception.
Replace the package's `migration` status with
`ghostPackage.goldenPath: compliant` only after every mechanical golden-path
check passes.

Use the subject `Converted <package> to TypeScript`.

## Hold the conversion to production standards

- Model real input, output and registry shapes; do not replace missing types
  with `any`.
- Use `unknown` only at genuine untrusted boundaries and narrow it promptly.
- Do not use broad casts, non-null assertions, `@ts-ignore`, or lint disables
  merely to silence the compiler.
- Preserve the package's runtime API unless an API change is explicitly in
  scope and all consumers are updated.
- Use explicit `.ts` extensions for relative TypeScript imports under the
  repository's NodeNext configuration.
- Replace dynamic CommonJS discovery with explicit typed registries when ESM
  cannot express the old loading pattern safely.
- Ensure JSON and other runtime assets are emitted and available from `build/`.
- Avoid top-level `await` so supported CommonJS consumers can use Node's
  `require(esm)` interoperability.
- Do not weaken shared TypeScript, ESLint or Vitest rules to make the conversion
  pass.

## Verify the result

Run the build, tests and lint commands required by `packages/README.md`. Also:

- exercise representative consumers using their real `import` or `require()`
  path;
- test raw `source` resolution and compiled output where both are used;
- inspect the packed package or Ghost release component when exports, runtime
  assets or archive inclusion changed;
- run the repository build when the workspace build graph changed;
- run `git diff --summary` for each mechanical commit and `git log --follow` on
  representative files to confirm the lineage remains readable.

The modernization PR may be rebase-merged when these commits are independently
valid and intentionally ordered. This does not change the merge-commit
requirement for a preceding subtree history import.
