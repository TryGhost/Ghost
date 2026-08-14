---
name: migrate-internal-package
description: Move a package from another TryGhost repository into Ghost as an internal-only workspace package while preserving its Git history. Use for package migrations from repositories such as TryGhost/SDK or TryGhost/framework, including the history import PR, exceptional merge-commit handoff, source-repository removal PR, optional npm deprecation, migration cleanup, and modernization handoff.
---

# Migrate an internal package into Ghost

Move a package from another TryGhost repository into Ghost without losing its
history or creating a period where neither repository owns it. Keep migration
mechanics separate from Ghost's lifetime package standards.

## Authority boundaries

Explain every cross-repository or administrative action before it happens.

- A request for instructions is not permission to perform the action.
- If the user says "tell me how, I do it", provide the command and wait.
- Require explicit authorization before changing repository settings, merging a
  PR, deprecating npm versions, or force-pushing.
- Never ask for, display, or store credentials or OTPs.

## Confirm this workflow applies

Before changing either repository, record the source repository, its default
branch, the package path within it, the destination path in Ghost, and whether
the package has been published to npm. Then:

1. Find every Ghost and source-repository reference to the package name and
   directory.
2. Inspect its npm metadata, README, documentation, release configuration and
   known public consumers.
3. Confirm Ghost is the real owner and can consume it via `workspace:*`.
4. Identify any need for independent releases or supported external use.

Publication or download counts alone do not prove that a package must remain a
supported public API. If supported external consumers still need new releases,
stop: this internal-only workflow is the wrong publishing model.

## Produce these work products in order

1. A green Ghost import PR with reachable source history.
2. After it merges, a green source-repository removal PR.
3. npm deprecation if the package was published and new direct use is
   unsupported.
4. A focused Ghost cleanup PR for stale migration-specific automation.
5. A Ghost modernization PR assessed against the current package template and
   comparable internal packages.

Keep the history import and modernization separate. The import establishes
ownership and provenance; later commits can modernize code without obscuring
the move.

## 1. Import the history into Ghost

Read
[`references/history-and-merge.md`](references/history-and-merge.md) completely
before manipulating history.

Use an unsquashed `git subtree` import from the recorded source repository and
package path. Do not copy the current files, pass `--squash`, or recreate old
commits manually.

After the subtree commit, add focused integration commits that:

- make the package private with an internal placeholder version;
- switch Ghost consumers to `workspace:*`;
- update the lockfile with `pnpm`;
- minimally adapt configuration and tests to work in Ghost;
- retain runtime behavior for the later modernization PR.

Verify that the subtree commit has two parents and that representative file
history crosses into the source repository before opening the PR.

## 2. Merge the import without rewriting history

This is the exceptional PR. It must use GitHub's **Create a merge commit**
method:

- squash merge discards the imported ancestry;
- rebase merge cannot preserve the subtree merge topology.

Make CI green, then stop at the merge checkpoint. If the merge-commit option is
disabled, an authorized org admin should run:

```bash
.agents/skills/migrate-internal-package/scripts/merge-history-pr \
    TryGhost/Ghost \
    <pr-number> \
    <source-split-tip> \
    --confirm
```

An agent without admin authority should provide that exact handoff rather than
attempting a workaround. The script performs preflight checks, records and
temporarily changes the setting, uses the correct merge form, restores the
setting, and verifies the resulting history.

Afterward, independently fetch `main` and confirm the source split tip is an
ancestor before starting source-repository cleanup.

## 3. Remove the package from the source repository

Branch from the latest source default branch only after the Ghost import is
verified on `main`. Remove:

- the package directory;
- workspace and lockfile entries;
- release, Changesets and publishing configuration;
- package-specific Renovate rules;
- tests, documentation and examples that claim source-repository ownership;
- remaining source-repository consumers or imports.

Search with both the npm name and directory name. The source-repository PR
should link to the merged Ghost PR and state that Ghost now owns the
implementation. Use that repository's normal merge policy; this PR does not
contain imported ancestry.

## 4. Deprecate npm when appropriate

If the package was published and new direct use is now unsupported, deprecate
all historical versions rather than unpublishing them:

```bash
npm deprecate '@tryghost/<package>@*' \
  'This package is now maintained as an internal Ghost workspace package. Existing versions remain available for older Ghost releases; direct use is unsupported.'
npm view @tryghost/<package> deprecated
```

This preserves installation for old Ghost releases. Authentication and OTP are
human checkpoints; verify the public metadata after the authorized user runs
the mutation.

## 5. Remove migration-specific automation

Search `.github/renovate.json5` and related release automation for rules that
still treat the package as sourced or released from the former repository or
npm. Prefer a small,
standalone cleanup PR so the later conversion remains focused.

## 6. Hand off to the package golden path

Compare the package against `packages/_template`, current comparable internal
packages, and any canonical package guidance in the repository. Do not turn
this one-time migration skill into the source of lifetime package standards.

For a legacy `lib/*.js` package, preserve file lineage with three focused
commits:

1. `Moved ... sources from lib to src` — paths and path references only.
2. `Changed ... file extensions to TypeScript` — mechanical renames and the
   minimum compilation scaffolding.
3. `Converted ... to TypeScript` — types, ESM semantics and cleanup.

Use `git diff --summary` after mechanical commits and confirm Git recognizes
the files as renames. A small CommonJS forwarding shim may correctly appear as
a deletion when a real ESM export replaces it.

This modernization PR may be rebase-merged when the commits are independently
valid and intentionally ordered. That does not alter the merge-commit
requirement for the earlier subtree import.

## Completion criteria

Do not call the migration complete until:

- the source split history is reachable from Ghost `main`;
- Ghost consumes the workspace package;
- the source repository no longer consumes or publishes it;
- npm status matches the chosen support policy;
- stale migration automation is gone;
- the package satisfies the repository's current internal-package standards;
- relevant package, consumer and archive checks pass;
- temporarily changed repository settings are restored.

At each boundary, distinguish what is merged from what is merely prepared and
report the exact verification performed.

## Exclusions

Do not use this workflow for packages that remain public, independently
versioned, or supported for third-party use. This skill describes privileged
operations but does not authorize them.
