# History and verification reference

## Known-good commit shape

The `admin-api-schema` conversion used three deliberately separate commits:

1. `688807ca052 Moved Admin API schema sources from lib to src`
2. `be31b36ffab Changed Admin API schema file extensions to TypeScript`
3. `b825dafdc19 Converted Admin API schemas to TypeScript`

This ordering lets Git and reviewers distinguish relocation, mechanical
renaming and semantic conversion. It is an example of the shape, not a reason
to copy package-specific implementation.

## History checks

Use `git mv` for every move or extension change. After each mechanical commit,
inspect the summary and a representative file:

```bash
git diff --summary HEAD^
git log --follow -- packages/<name>/src/<representative-file>.ts
```

Git records snapshots rather than an explicit rename operation, so rename
detection depends on similarity. A file that is both moved and substantially
rewritten in one commit can appear as a deletion and addition. Separate those
operations so history remains intelligible.

A small CommonJS forwarding file may legitimately appear as deleted when the
new ESM entry point replaces it; verify the implementation's lineage rather
than forcing a misleading rename.

## Compatibility checks

Inspect actual consumers before choosing output formats. For the normal
internal-package contract, first verify from the worktree that a consumer using
the `source` condition resolves and loads raw TypeScript in development/tests.

Then build and pack the package. Verify against the packed artifact that:

- plain Node can import the compiled ESM entry point;
- any existing CommonJS consumer can `require()` the compiled entry point on
  Ghost's supported Node versions;
- the compiled module graph contains no top-level `await`;
- the shipped `types`, `default` and `main` targets resolve to files in the
  artifact.

Do not add a second CommonJS build speculatively. Record and test any required
exception in the package README and configuration.

## Assets and packaging checks

Build from a clean package output and inspect `build/` for every runtime file.
When JSON schemas or similar assets are required, import them from TypeScript
when the compiler can emit them; otherwise use an explicit portable copy step.

Use the repository's existing pack or release-archive checks where available.
Confirm that:

- production execution does not read from `src/`;
- `files` includes the built output and excludes authored source unless the
  package contract explicitly says otherwise;
- consumer behavior is tested against the artifact, not only the worktree.

## Review the final diff

Before opening the PR, inspect each commit independently as well as the total
diff. Look specifically for accidental formatting churn, weakened compiler or
lint rules, unexplained `unknown` or casts, stale CommonJS configuration,
missing assets, and consumers that still bypass the package exports.
