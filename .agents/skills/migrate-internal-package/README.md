# Migrating a package into Ghost

This guide is for the human coordinating a package migration with the
`migrate-internal-package` skill. The skill moves a package from another
TryGhost repository into Ghost as an internal workspace package while retaining
the package's original Git history.

History preservation makes the import PR different from an ordinary Ghost PR.
Do not use GitHub's squash or rebase merge controls for it.

## Before starting

Confirm that:

- Ghost should become the package's owner;
- the package no longer needs independent releases for supported external use;
- both repositories are available locally as full clones;
- the agent may create branches and PRs, but understands that merging and
  repository-setting changes require separate authorization.

Start the workflow from the Ghost repository with a concrete source URL:

```text
Use $migrate-internal-package to move
https://github.com/TryGhost/<source>/tree/main/packages/<package>
into Ghost as an internal-only package.
```

## The two-step import

### 1. Let the agent prepare the import PR

The agent audits ownership and consumers, extracts the package-only history,
imports it with an unsquashed Git subtree merge, integrates the package into the
Ghost workspace, and runs the required checks.

The resulting PR must:

- have a title beginning `[Don't merge]`;
- warn against using GitHub's normal merge controls;
- record the full source split SHA and subtree commit SHA;
- include ready-to-run `--dry-run` and `--confirm` commands with no placeholders;
- be green before reaching the merge checkpoint.

At this point the agent stops. `[Don't merge]` means “do not merge normally,”
not “this work should never merge.” Keep the prefix until the guarded command
performs the exceptional merge.

### 2. Perform the guarded merge

An authorized Ghost administrator runs the commands from the Ghost repository
root. First run the read-only preflight copied from the PR:

```bash
.agents/skills/migrate-internal-package/scripts/merge-history-pr \
    TryGhost/Ghost \
    <pr-number> \
    <full-source-split-sha> \
    --dry-run
```

Check that it reports the expected repository, PR head and source split SHA. It
also confirms that CI is green, the PR is mergeable, and the source history is
reachable from the PR branch. The dry run does not change settings or merge the
PR.

If the output is correct, explicitly authorize the merge and run:

```bash
.agents/skills/migrate-internal-package/scripts/merge-history-pr \
    TryGhost/Ghost \
    <pr-number> \
    <full-source-split-sha> \
    --confirm
```

The script records Ghost's merge-commit setting, temporarily enables merge
commits if required, merges with the PR head pinned, restores the original
setting, and verifies that the resulting commit has two parents and still
contains the imported ancestry.

Do not substitute a manual `gh pr merge`, GitHub squash merge, rebase merge, or
merge queue. If the script reports a protection or permission failure, stop and
resolve that specific blocker rather than bypassing it.

## After the guarded merge

Ask the agent to continue the migration only after it fetches Ghost `main` and
confirms that the recorded source split SHA is an ancestor. The remaining work
is deliberately separate:

1. Remove the package and its publishing configuration from the source
   repository in a normal PR.
2. Decide whether the public npm versions should be deprecated for new direct
   use. Existing versions remain published for old Ghost releases.
3. Remove migration-only catalog or Renovate configuration from Ghost.
4. Modernize the internal package in a focused PR when necessary.

Source cleanup must not start before the history-preserving Ghost merge is
verified. This ordering prevents a period where neither repository owns the
package.

## Recovery and escalation

- If CI changes the PR head, rerun `--dry-run`; the script pins the merge to the
  current reviewed head.
- If the source split SHA is missing or ambiguous, do not infer it. Ask the
  agent to verify the subtree topology and update the PR instructions.
- If the repository merge setting cannot be restored, treat the script's
  critical error as an administrative incident and restore the original value
  before doing anything else.
- If external consumers still require new releases, stop. The internal-only
  migration workflow is not the correct ownership model.

For the agent's complete operating procedure, see [`SKILL.md`](SKILL.md).
