# Move an internal package into Ghost

Packages in TryGhost repositories such as SDK and framework can be moved into
Ghost when Ghost is their real owner and they no longer need independent
releases. Use the `migrate-internal-package` skill to preserve the package's Git
history, integrate it into the Ghost workspace and coordinate the cleanup work
across repositories.

Start the skill from the Ghost repository with the source package URL:

```text
Use $migrate-internal-package to move
https://github.com/TryGhost/<source>/tree/main/packages/<package>
into Ghost as an internal-only package.
```

The skill first checks the package's consumers, npm status, dependencies and
release configuration. It stops if the package still needs to be independently
versioned or supported for external use, because that requires a different
publishing model.

## What the skill produces

The migration is split into focused pull requests so the history import remains
reviewable:

1. A Ghost import PR containing the original package history and the minimum
   workspace integration.
2. After the import is merged and verified, a source-repository PR removing the
   old package and its publishing configuration.
3. When applicable, follow-up PRs for migration-only configuration cleanup and
   package modernization.

The import PR keeps behavior changes and modernization out of the move. It
switches Ghost consumers to `workspace:*`, marks the package private, maps its
dependencies into the Ghost workspace and verifies the real production package
path and release archive.

## Run the migration

### 1. Let the skill prepare the import

The skill extracts the package-only history and imports it with an unsquashed
Git subtree merge. The resulting Ghost PR must:

- have a title beginning `[Don't merge]`;
- warn against using GitHub's normal merge controls;
- record the full source split SHA and subtree commit SHA;
- include a ready-to-run `--confirm` command with no placeholders;
- have green CI before reaching the merge checkpoint.

`[Don't merge]` means that the PR must not use Ghost's normal squash or rebase
merge. Keep the prefix in place until the guarded command performs the
history-preserving merge.

The skill also runs the guarded merge script in read-only mode. This verifies
the PR state, CI, reviewed head, repository setting and imported ancestry
without changing GitHub. It resolves preparation failures where possible and
includes the successful preflight evidence in its handoff.

### 2. Ask a repository administrator to merge it

The skill stops at the only manual checkpoint and asks a Ghost repository
administrator to run the command provided in the PR from the Ghost repository
root:

```bash
.agents/skills/migrate-internal-package/scripts/merge-history-pr \
    TryGhost/Ghost \
    <pr-number> \
    <full-source-split-sha> \
    --confirm
```

The script records Ghost's merge-commit setting, temporarily enables merge
commits if required, merges with the reviewed PR head pinned, restores the
original setting, and verifies that the resulting commit has two parents and
still contains the imported ancestry.

This operation requires repository administration permission because Ghost
normally has merge commits disabled. It is intentionally performed by a human
administrator rather than by the skill.

Do not substitute a manual `gh pr merge`, GitHub squash merge, rebase merge, or
merge queue. If the script reports a protection or permission failure, resolve
that specific blocker rather than bypassing it.

### 3. Let the skill complete the migration

After the administrator reports that the command completed, ask the skill to
continue. It fetches Ghost `main` and confirms that the recorded source split
SHA is an ancestor before removing anything from the source repository. It then
automates or prepares the remaining work:

1. Remove the package and its publishing configuration from the source
   repository in a normal PR.
2. Decide whether the public npm versions should be deprecated for new direct
   use. Existing versions remain published for old Ghost releases.
3. Remove migration-only catalog or Renovate configuration from Ghost.
4. Modernize the internal package in a focused PR when necessary.

Source cleanup must not start before the history-preserving Ghost merge is
verified. This ordering prevents a period where neither repository owns the
package.

## If the merge cannot proceed

- If CI or another commit changes the PR head, ask the skill to rerun its
  preflight and produce a new handoff; the script pins the merge to the current
  reviewed head.
- If the source split SHA is missing or ambiguous, ask the skill to verify the
  subtree topology and update the PR instructions. Do not infer it.
- If the repository merge setting cannot be restored, restore its original
  value before continuing.
- If the consumer audit finds supported external use, stop the internal-only
  migration and keep an appropriate independent publishing path.

The detailed agent procedure is in the
[`migrate-internal-package` skill](../../.agents/skills/migrate-internal-package/SKILL.md).
