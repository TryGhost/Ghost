# Move an internal package into Ghost

Use the `migrate-internal-package` skill when Ghost should take ownership of a
package from another TryGhost repository, such as SDK or framework. The skill
preserves its Git history and coordinates the work across both repositories.

Any contributor can run the skill. A Ghost repository administrator is needed
only to merge the history-import PR.

## 1. Ask the AI to prepare the migration

From the Ghost repository, provide the package URL:

```text
Use $migrate-internal-package to move
https://github.com/TryGhost/<source>/tree/main/packages/<package>
into Ghost as an internal-only package.
```

The skill audits current consumers, prepares and tests the Ghost import, and
opens a PR. It stops when the PR is ready for its exceptional merge.

Expect the handoff to include:

- a green, unstacked PR titled `[Don't merge] ...`;
- a successful read-only preflight;
- the source-history and reviewed-head SHAs;
- a complete administrator command with no placeholders.

Do not merge this PR with GitHub's squash, rebase, merge queue, or stacked-PR
controls. Those paths either discard the imported history or require a
background merge while Ghost's repository-wide merge-commit setting is enabled.

## 2. Ask an administrator to merge it

Send the command from the skill's handoff to a Ghost repository administrator.
They run it from an up-to-date Ghost checkout:

```bash
.agents/skills/migrate-internal-package/scripts/merge-history-pr \
    TryGhost/Ghost \
    <pr-number> \
    <full-source-split-sha> \
    <dry-run-head-sha> \
    --confirm
```

The command pins the reviewed PR head, briefly enables merge commits, performs
the merge, restores the original repository setting, and verifies the imported
history. Never replace the values supplied by the skill.

If the command fails, stop and give its complete output back to the skill. In
particular, unstack a stacked PR or rerun the preflight after any head change.

## 3. Ask the AI to continue

After the administrator command succeeds, tell the skill to continue. It
independently verifies the history on `main`, then handles the source-repository
removal, npm deprecation where appropriate, migration cleanup, and a separate
modernization PR when needed.

Do not remove the source package before the skill verifies the Ghost merge.

The detailed agent procedure lives in the
[`migrate-internal-package` skill](../../.agents/skills/migrate-internal-package/SKILL.md).
